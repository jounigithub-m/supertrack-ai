"""Security models for the Data Management Agent.

This module defines the data models used for security scanning, monitoring,
and reporting in the Supertrack AI Platform.
"""

from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional


class Severity(Enum):
    """Severity levels for security findings."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingType(Enum):
    """Types of security findings."""
    CODE_VULNERABILITY = "CODE_VULNERABILITY"
    RUNTIME_ALERT = "RUNTIME_ALERT"
    CONFIGURATION_ISSUE = "CONFIGURATION_ISSUE"
    DEPENDENCY_VULNERABILITY = "DEPENDENCY_VULNERABILITY"
    COMPLIANCE_VIOLATION = "COMPLIANCE_VIOLATION"
    ACCESS_CONTROL_VIOLATION = "ACCESS_CONTROL_VIOLATION"


class SecurityFinding:
    """Security finding model representing a detected vulnerability or issue."""
    
    def __init__(
        self,
        finding_id: str,
        finding_type: FindingType,
        severity: Severity,
        description: str,
        location: str,
        code_snippet: Optional[str] = None,
        recommendation: Optional[str] = None,
        detected_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Initialize a security finding.
        
        Args:
            finding_id: Unique identifier for the finding.
            finding_type: Type of security finding.
            severity: Severity level of the finding.
            description: Description of the security issue.
            location: Location of the issue (file path, line number, etc.).
            code_snippet: Optional snippet of code related to the finding.
            recommendation: Optional recommendation for fixing the issue.
            detected_at: Optional timestamp when the finding was detected.
            metadata: Optional additional metadata about the finding.
        """
        self.finding_id = finding_id
        self.finding_type = finding_type
        self.severity = severity
        self.description = description
        self.location = location
        self.code_snippet = code_snippet
        self.recommendation = recommendation
        self.detected_at = detected_at or datetime.now()
        self.metadata = metadata or {}


class RuntimeAlert:
    """Runtime security alert model representing a runtime security issue."""
    
    def __init__(
        self,
        alert_id: str,
        severity: Severity,
        description: str,
        resource: str,
        detected_at: datetime,
        rule_name: str,
        process: str,
        container_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Initialize a runtime security alert.
        
        Args:
            alert_id: Unique identifier for the alert.
            severity: Severity level of the alert.
            description: Description of the security issue.
            resource: Resource affected by the issue.
            detected_at: Timestamp when the alert was detected.
            rule_name: Name of the rule that triggered the alert.
            process: Process related to the alert.
            container_id: Optional container ID if running in containerized env.
            metadata: Optional additional metadata about the alert.
        """
        self.alert_id = alert_id
        self.severity = severity
        self.description = description
        self.resource = resource
        self.detected_at = detected_at
        self.rule_name = rule_name
        self.process = process
        self.container_id = container_id
        self.metadata = metadata or {}


class CodeScanResult:
    """Results of a code security scan."""
    
    def __init__(
        self,
        scan_id: str,
        tenant_id: str,
        scan_time: datetime,
        target_path: str,
        findings_count: int,
        findings: List[SecurityFinding],
        high_severity_count: int,
        medium_severity_count: int,
        low_severity_count: int,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Initialize a code scan result.
        
        Args:
            scan_id: Unique identifier for the scan.
            tenant_id: Tenant ID for which the scan was performed.
            scan_time: Timestamp when the scan was performed.
            target_path: Path to the code that was scanned.
            findings_count: Total number of findings.
            findings: List of security findings.
            high_severity_count: Number of high severity findings.
            medium_severity_count: Number of medium severity findings.
            low_severity_count: Number of low severity findings.
            metadata: Optional additional metadata about the scan.
        """
        self.scan_id = scan_id
        self.tenant_id = tenant_id
        self.scan_time = scan_time
        self.target_path = target_path
        self.findings_count = findings_count
        self.findings = findings
        self.high_severity_count = high_severity_count
        self.medium_severity_count = medium_severity_count
        self.low_severity_count = low_severity_count
        self.metadata = metadata or {}


class SecurityScanResult:
    """General security scan result model."""
    
    def __init__(
        self,
        scan_id: str,
        tenant_id: str,
        scan_type: str,
        scan_time: datetime,
        findings_count: int,
        findings: List[SecurityFinding],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Initialize a security scan result.
        
        Args:
            scan_id: Unique identifier for the scan.
            tenant_id: Tenant ID for which the scan was performed.
            scan_type: Type of security scan (code, config, etc.).
            scan_time: Timestamp when the scan was performed.
            findings_count: Total number of findings.
            findings: List of security findings.
            metadata: Optional additional metadata about the scan.
        """
        self.scan_id = scan_id
        self.tenant_id = tenant_id
        self.scan_type = scan_type
        self.scan_time = scan_time
        self.findings_count = findings_count
        self.findings = findings
        self.metadata = metadata or {}
        
        # Calculate severity counts
        self.high_severity_count = sum(1 for f in findings if f.severity == Severity.HIGH)
        self.medium_severity_count = sum(1 for f in findings if f.severity == Severity.MEDIUM)
        self.low_severity_count = sum(1 for f in findings if f.severity == Severity.LOW)


class SecurityReport:
    """Comprehensive security report model."""
    
    def __init__(
        self,
        report_id: str,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime,
        generated_at: datetime,
        total_findings: int,
        total_alerts: int,
        high_severity_findings: int,
        medium_severity_findings: int,
        low_severity_findings: int,
        high_severity_alerts: int,
        medium_severity_alerts: int,
        low_severity_alerts: int,
        findings: List[Dict[str, Any]],
        alerts: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Initialize a security report.
        
        Args:
            report_id: Unique identifier for the report.
            tenant_id: Tenant ID for which the report was generated.
            start_date: Start date of the report period.
            end_date: End date of the report period.
            generated_at: Timestamp when the report was generated.
            total_findings: Total number of findings in the period.
            total_alerts: Total number of alerts in the period.
            high_severity_findings: Number of high severity findings.
            medium_severity_findings: Number of medium severity findings.
            low_severity_findings: Number of low severity findings.
            high_severity_alerts: Number of high severity alerts.
            medium_severity_alerts: Number of medium severity alerts.
            low_severity_alerts: Number of low severity alerts.
            findings: List of security findings.
            alerts: List of runtime alerts.
            metadata: Optional additional metadata about the report.
        """
        self.report_id = report_id
        self.tenant_id = tenant_id
        self.start_date = start_date
        self.end_date = end_date
        self.generated_at = generated_at
        self.total_findings = total_findings
        self.total_alerts = total_alerts
        self.high_severity_findings = high_severity_findings
        self.medium_severity_findings = medium_severity_findings
        self.low_severity_findings = low_severity_findings
        self.high_severity_alerts = high_severity_alerts
        self.medium_severity_alerts = medium_severity_alerts
        self.low_severity_alerts = low_severity_alerts
        self.findings = findings
        self.alerts = alerts
        self.metadata = metadata or {}
        
        # Calculate total high and medium issues
        self.high_severity_total = high_severity_findings + high_severity_alerts
        self.medium_severity_total = medium_severity_findings + medium_severity_alerts
        self.low_severity_total = low_severity_findings + low_severity_alerts
        
        # Calculate risk score (0-100, higher is worse)
        self.risk_score = min(100, (
            (self.high_severity_total * 10) +
            (self.medium_severity_total * 5) +
            (self.low_severity_total * 1)
        ))
        
        # Determine overall security status
        if self.risk_score >= 70:
            self.security_status = "CRITICAL"
        elif self.risk_score >= 40:
            self.security_status = "WARNING"
        elif self.risk_score >= 10:
            self.security_status = "CAUTION"
        else:
            self.security_status = "GOOD" 