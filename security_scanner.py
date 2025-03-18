"""Security Scanner module for the Data Management Agent.

This module provides security scanning capabilities including code security scanning,
runtime security monitoring, and security reporting systems.
"""

import logging
import json
import re
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Set

import azure.functions as func
import bandit
from bandit.core import manager as bandit_manager
from bandit.core import config as bandit_config
import semgrep
import falco
from azure.storage.blob import BlobServiceClient
from azure.cosmos import CosmosClient

from shared.utils.auth import get_current_user, validate_tenant_access
from shared.config import settings
from shared.models.security import (
    SecurityFinding,
    SecurityScanResult,
    SecurityReport,
    Severity,
    FindingType,
    CodeScanResult,
    RuntimeAlert
)

# Configure logging
logger = logging.getLogger(__name__)


class SecurityScanner:
    """Security scanner for code and runtime monitoring.
    
    This class provides functionality to scan code for security vulnerabilities,
    monitor runtime environments, and generate security reports.
    """
    
    def __init__(self, tenant_id: str):
        """Initialize the security scanner.
        
        Args:
            tenant_id: The tenant ID for which to perform security scanning.
        """
        self.tenant_id = tenant_id
        self.cosmos_client = CosmosClient(
            settings.COSMOS_ENDPOINT, 
            settings.COSMOS_KEY
        )
        self.database = self.cosmos_client.get_database_client(settings.COSMOS_DATABASE)
        self.container = self.database.get_container_client("security_findings")
        self.blob_service_client = BlobServiceClient.from_connection_string(
            settings.STORAGE_CONNECTION_STRING
        )
        self.code_container = self.blob_service_client.get_container_client(
            f"{tenant_id}-code-repository"
        )
        
        # Initialize scanning configurations
        self._load_scanning_configs()
        
    def _load_scanning_configs(self) -> None:
        """Load security scanning configurations from storage."""
        try:
            config_container = self.blob_service_client.get_container_client("security-configs")
            config_blob = config_container.get_blob_client(f"{self.tenant_id}-security-config.json")
            config_data = config_blob.download_blob().readall()
            self.security_config = json.loads(config_data)
        except Exception as e:
            logger.warning(f"Failed to load custom security config: {str(e)}")
            # Load default configuration
            self.security_config = {
                "code_scan": {
                    "enabled": True,
                    "scan_frequency": "on_commit",
                    "severity_threshold": "MEDIUM",
                    "excluded_patterns": [],
                    "custom_rules": []
                },
                "runtime_monitoring": {
                    "enabled": True,
                    "alert_threshold": "HIGH",
                    "monitoring_frequency": 300,  # seconds
                    "custom_rules": []
                },
                "reporting": {
                    "enabled": True,
                    "report_frequency": "DAILY",
                    "recipients": ["security@example.com"]
                }
            }
    
    def scan_code(self, code_path: str, scan_id: Optional[str] = None) -> CodeScanResult:
        """Scan code for security vulnerabilities.
        
        Args:
            code_path: Path to the code to scan.
            scan_id: Optional ID for the scan.
            
        Returns:
            Results of the code security scan.
        """
        if not scan_id:
            scan_id = f"code-scan-{self.tenant_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
        logger.info(f"Starting code security scan {scan_id} for path {code_path}")
        
        findings = []
        
        # Run Bandit scanner for Python code
        try:
            b_conf = bandit_config.BanditConfig()
            b_mgr = bandit_manager.BanditManager(b_conf, "file")
            b_mgr.discover_files([code_path])
            b_mgr.run_tests()
            
            for issue in b_mgr.get_issue_list():
                findings.append(SecurityFinding(
                    finding_id=f"{scan_id}-bandit-{len(findings)}",
                    finding_type=FindingType.CODE_VULNERABILITY,
                    severity=self._map_bandit_severity(issue.severity),
                    description=issue.text,
                    location=f"{issue.fname}:{issue.lineno}",
                    code_snippet=issue.get_code() if hasattr(issue, 'get_code') else "",
                    recommendation=f"Fix {issue.test_id} issue: {issue.text}",
                    detected_at=datetime.now()
                ))
        except Exception as e:
            logger.error(f"Error during Bandit scan: {str(e)}")
            
        # Run Semgrep scanner for additional rules
        try:
            custom_rules = self.security_config["code_scan"]["custom_rules"]
            semgrep_results = semgrep.scan(
                code_path,
                config=custom_rules if custom_rules else "p/security-audit"
            )
            
            for result in semgrep_results["results"]:
                findings.append(SecurityFinding(
                    finding_id=f"{scan_id}-semgrep-{len(findings)}",
                    finding_type=FindingType.CODE_VULNERABILITY,
                    severity=self._map_semgrep_severity(result["severity"]),
                    description=result["message"],
                    location=f"{result['path']}:{result['start']['line']}",
                    code_snippet=result["extra"]["lines"],
                    recommendation=result.get("fix", "Review and fix the detected issue"),
                    detected_at=datetime.now()
                ))
        except Exception as e:
            logger.error(f"Error during Semgrep scan: {str(e)}")
        
        # Store findings in Cosmos DB
        for finding in findings:
            self._store_finding(finding)
            
        # Generate scan result
        scan_result = CodeScanResult(
            scan_id=scan_id,
            tenant_id=self.tenant_id,
            scan_time=datetime.now(),
            target_path=code_path,
            findings_count=len(findings),
            findings=findings,
            high_severity_count=sum(1 for f in findings if f.severity == Severity.HIGH),
            medium_severity_count=sum(1 for f in findings if f.severity == Severity.MEDIUM),
            low_severity_count=sum(1 for f in findings if f.severity == Severity.LOW)
        )
        
        # Store scan result summary
        self._store_scan_result(scan_result)
        
        return scan_result
    
    def _map_bandit_severity(self, bandit_severity: str) -> Severity:
        """Map Bandit severity to internal severity enum.
        
        Args:
            bandit_severity: Severity string from Bandit tool.
            
        Returns:
            Mapped internal severity level.
        """
        severity_map = {
            "HIGH": Severity.HIGH,
            "MEDIUM": Severity.MEDIUM,
            "LOW": Severity.LOW
        }
        return severity_map.get(bandit_severity, Severity.LOW)
    
    def _map_semgrep_severity(self, semgrep_severity: str) -> Severity:
        """Map Semgrep severity to internal severity enum.
        
        Args:
            semgrep_severity: Severity string from Semgrep tool.
            
        Returns:
            Mapped internal severity level.
        """
        severity_map = {
            "ERROR": Severity.HIGH,
            "WARNING": Severity.MEDIUM,
            "INFO": Severity.LOW
        }
        return severity_map.get(semgrep_severity, Severity.LOW)
    
    def _store_finding(self, finding: SecurityFinding) -> None:
        """Store a security finding in Cosmos DB.
        
        Args:
            finding: Security finding to store.
        """
        try:
            finding_dict = finding.__dict__
            finding_dict["tenant_id"] = self.tenant_id
            finding_dict["id"] = finding.finding_id
            self.container.upsert_item(finding_dict)
        except Exception as e:
            logger.error(f"Failed to store security finding: {str(e)}")
    
    def _store_scan_result(self, scan_result: CodeScanResult) -> None:
        """Store a scan result summary in Cosmos DB.
        
        Args:
            scan_result: Scan result to store.
        """
        try:
            result_dict = {
                "id": scan_result.scan_id,
                "tenant_id": self.tenant_id,
                "scan_time": scan_result.scan_time.isoformat(),
                "target_path": scan_result.target_path,
                "findings_count": scan_result.findings_count,
                "high_severity_count": scan_result.high_severity_count,
                "medium_severity_count": scan_result.medium_severity_count,
                "low_severity_count": scan_result.low_severity_count,
                "type": "code_scan"
            }
            
            summary_container = self.database.get_container_client("security_scans")
            summary_container.upsert_item(result_dict)
        except Exception as e:
            logger.error(f"Failed to store scan result: {str(e)}")
    
    def monitor_runtime(self) -> List[RuntimeAlert]:
        """Monitor runtime environment for security issues.
        
        Returns:
            List of runtime security alerts.
        """
        logger.info(f"Starting runtime security monitoring for tenant {self.tenant_id}")
        
        alerts = []
        
        # Use Falco for runtime security monitoring
        try:
            # Initialize Falco with custom rules if available
            custom_rules = self.security_config["runtime_monitoring"]["custom_rules"]
            falco_client = falco.Client()
            
            if custom_rules:
                for rule in custom_rules:
                    falco_client.add_rule(rule)
            
            # Get events from Falco
            events = falco_client.get_events()
            
            for event in events:
                if event.priority >= self._get_falco_threshold():
                    alert = RuntimeAlert(
                        alert_id=f"runtime-{self.tenant_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(alerts)}",
                        severity=self._map_falco_severity(event.priority),
                        description=event.output,
                        resource=event.source,
                        detected_at=datetime.now(),
                        rule_name=event.rule,
                        process=event.process,
                        container_id=event.container_id if hasattr(event, 'container_id') else None
                    )
                    alerts.append(alert)
                    self._store_runtime_alert(alert)
                    
        except Exception as e:
            logger.error(f"Error during runtime monitoring: {str(e)}")
            
        return alerts
    
    def _map_falco_severity(self, falco_priority: int) -> Severity:
        """Map Falco priority to internal severity enum.
        
        Args:
            falco_priority: Priority level from Falco.
            
        Returns:
            Mapped internal severity level.
        """
        if falco_priority <= 3:
            return Severity.LOW
        elif falco_priority <= 6:
            return Severity.MEDIUM
        else:
            return Severity.HIGH
    
    def _get_falco_threshold(self) -> int:
        """Get the threshold for Falco alerts based on configuration.
        
        Returns:
            Threshold priority level.
        """
        threshold = self.security_config["runtime_monitoring"]["alert_threshold"]
        if threshold == "LOW":
            return 3
        elif threshold == "MEDIUM":
            return 6
        else:
            return 8
    
    def _store_runtime_alert(self, alert: RuntimeAlert) -> None:
        """Store a runtime alert in Cosmos DB.
        
        Args:
            alert: Runtime alert to store.
        """
        try:
            alert_dict = alert.__dict__
            alert_dict["tenant_id"] = self.tenant_id
            alert_dict["id"] = alert.alert_id
            alert_dict["type"] = "runtime_alert"
            
            alert_container = self.database.get_container_client("security_alerts")
            alert_container.upsert_item(alert_dict)
        except Exception as e:
            logger.error(f"Failed to store runtime alert: {str(e)}")
    
    def generate_security_report(self, 
                               start_date: datetime, 
                               end_date: datetime) -> SecurityReport:
        """Generate a security report for a time period.
        
        Args:
            start_date: Start date for the report period.
            end_date: End date for the report period.
            
        Returns:
            Security report for the specified period.
        """
        logger.info(f"Generating security report for tenant {self.tenant_id} from {start_date} to {end_date}")
        
        # Query for findings in the date range
        query = """
            SELECT * FROM c 
            WHERE c.tenant_id = @tenant_id 
            AND c.detected_at >= @start_date 
            AND c.detected_at <= @end_date
        """
        
        parameters = [
            {"name": "@tenant_id", "value": self.tenant_id},
            {"name": "@start_date", "value": start_date.isoformat()},
            {"name": "@end_date", "value": end_date.isoformat()}
        ]
        
        findings_query = self.container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        )
        
        findings = list(findings_query)
        
        # Query for runtime alerts
        alert_container = self.database.get_container_client("security_alerts")
        alerts_query = alert_container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        )
        
        alerts = list(alerts_query)
        
        # Generate report statistics
        total_findings = len(findings)
        total_alerts = len(alerts)
        
        high_severity_findings = sum(1 for f in findings if f.get("severity") == Severity.HIGH.value)
        medium_severity_findings = sum(1 for f in findings if f.get("severity") == Severity.MEDIUM.value)
        low_severity_findings = sum(1 for f in findings if f.get("severity") == Severity.LOW.value)
        
        high_severity_alerts = sum(1 for a in alerts if a.get("severity") == Severity.HIGH.value)
        medium_severity_alerts = sum(1 for a in alerts if a.get("severity") == Severity.MEDIUM.value)
        low_severity_alerts = sum(1 for a in alerts if a.get("severity") == Severity.LOW.value)
        
        # Create report
        report = SecurityReport(
            report_id=f"security-report-{self.tenant_id}-{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}",
            tenant_id=self.tenant_id,
            start_date=start_date,
            end_date=end_date,
            generated_at=datetime.now(),
            total_findings=total_findings,
            total_alerts=total_alerts,
            high_severity_findings=high_severity_findings,
            medium_severity_findings=medium_severity_findings,
            low_severity_findings=low_severity_findings,
            high_severity_alerts=high_severity_alerts,
            medium_severity_alerts=medium_severity_alerts,
            low_severity_alerts=low_severity_alerts,
            findings=findings[:100],  # Limit to 100 findings
            alerts=alerts[:100]  # Limit to 100 alerts
        )
        
        # Store report
        self._store_report(report)
        
        return report
    
    def _store_report(self, report: SecurityReport) -> None:
        """Store a security report in Cosmos DB.
        
        Args:
            report: Security report to store.
        """
        try:
            report_dict = report.__dict__
            report_dict["id"] = report.report_id
            
            report_container = self.database.get_container_client("security_reports")
            report_container.upsert_item(report_dict)
        except Exception as e:
            logger.error(f"Failed to store security report: {str(e)}")


def scan_all_code_for_tenant(tenant_id: str) -> Dict[str, CodeScanResult]:
    """Scan all code repositories for a tenant.
    
    Args:
        tenant_id: Tenant ID to scan code for.
        
    Returns:
        Dictionary of scan results by repository.
    """
    scanner = SecurityScanner(tenant_id)
    
    # Get list of repositories for tenant
    blob_service_client = BlobServiceClient.from_connection_string(
        settings.STORAGE_CONNECTION_STRING
    )
    code_container = blob_service_client.get_container_client(
        f"{tenant_id}-code-repository"
    )
    
    # Get all directories (repositories)
    repositories = set()
    blobs = code_container.list_blobs()
    for blob in blobs:
        repo_path = blob.name.split('/')[0]
        repositories.add(repo_path)
    
    # Scan each repository
    results = {}
    for repo in repositories:
        # Download repository to local path for scanning
        local_path = f"/tmp/{tenant_id}/{repo}"
        os.makedirs(local_path, exist_ok=True)
        
        # Download all files in repository
        blobs = code_container.list_blobs(name_starts_with=f"{repo}/")
        for blob in blobs:
            blob_client = code_container.get_blob_client(blob.name)
            file_path = os.path.join("/tmp", tenant_id, blob.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, "wb") as file:
                file.write(blob_client.download_blob().readall())
        
        # Scan repository
        scan_result = scanner.scan_code(local_path)
        results[repo] = scan_result
    
    return results


def security_scanner_func(req: func.HttpRequest) -> func.HttpResponse:
    """Azure Function for security scanning.
    
    Args:
        req: HTTP request.
        
    Returns:
        HTTP response.
    """
    logger.info("Processing security scanner request")
    
    # Get current user and validate access
    current_user = get_current_user(req)
    if not current_user:
        return func.HttpResponse(
            "Unauthorized",
            status_code=401
        )
    
    # Extract tenant ID from request
    tenant_id = req.route_params.get("tenant_id")
    if not tenant_id:
        return func.HttpResponse(
            "Tenant ID is required",
            status_code=400
        )
    
    # Validate tenant access
    if not validate_tenant_access(current_user, tenant_id):
        return func.HttpResponse(
            "Access denied for this tenant",
            status_code=403
        )
    
    # Get action from request
    try:
        req_body = req.get_json()
        action = req_body.get("action", "scan_code")
    except ValueError:
        action = "scan_code"
    
    scanner = SecurityScanner(tenant_id)
    
    if action == "scan_code":
        # Get code path from request
        code_path = req_body.get("code_path")
        if not code_path:
            return func.HttpResponse(
                "Code path is required for scanning",
                status_code=400
            )
        
        # Scan code
        scan_result = scanner.scan_code(code_path)
        return func.HttpResponse(
            json.dumps(scan_result.__dict__, default=lambda o: o.__dict__ if hasattr(o, '__dict__') else str(o)),
            mimetype="application/json"
        )
    
    elif action == "scan_all_code":
        # Scan all code repositories for tenant
        scan_results = scan_all_code_for_tenant(tenant_id)
        return func.HttpResponse(
            json.dumps(
                {repo: result.__dict__ for repo, result in scan_results.items()},
                default=lambda o: o.__dict__ if hasattr(o, '__dict__') else str(o)
            ),
            mimetype="application/json"
        )
    
    elif action == "monitor_runtime":
        # Monitor runtime
        alerts = scanner.monitor_runtime()
        return func.HttpResponse(
            json.dumps([alert.__dict__ for alert in alerts]),
            mimetype="application/json"
        )
    
    elif action == "generate_report":
        # Get date range from request
        start_date_str = req_body.get("start_date")
        end_date_str = req_body.get("end_date")
        
        if not start_date_str or not end_date_str:
            return func.HttpResponse(
                "Start date and end date are required for report generation",
                status_code=400
            )
        
        try:
            start_date = datetime.fromisoformat(start_date_str)
            end_date = datetime.fromisoformat(end_date_str)
        except ValueError:
            return func.HttpResponse(
                "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)",
                status_code=400
            )
        
        # Generate report
        report = scanner.generate_security_report(start_date, end_date)
        return func.HttpResponse(
            json.dumps(report.__dict__, default=lambda o: o.__dict__ if hasattr(o, '__dict__') else str(o)),
            mimetype="application/json"
        )
    
    else:
        return func.HttpResponse(
            f"Unknown action: {action}",
            status_code=400
        ) 