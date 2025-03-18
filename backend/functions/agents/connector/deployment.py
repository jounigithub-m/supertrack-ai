"""Connector deployment module for the Connector Management Agent.

This module provides functionality to deploy connectors to different environments
and manage connector versioning.
"""

import json
import logging
import os
import shutil
import tempfile
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

import azure.functions as func
from azure.storage.blob import BlobServiceClient
import git

from backend.functions.agents.connector.testing import ConnectorTester


logger = logging.getLogger(__name__)


class ConnectorDeployer:
    """Handles connector deployment and versioning."""
    
    def __init__(
        self,
        connectors_dir: str = "backend/functions/connectors",
        deployment_storage_connection_string: Optional[str] = None,
        deployment_container: str = "connector-deployments",
        code_repo_url: Optional[str] = None,
        code_repo_branch: str = "main",
        code_repo_username: Optional[str] = None,
        code_repo_password: Optional[str] = None,
    ):
        """Initialize the connector deployer.
        
        Args:
            connectors_dir: Directory containing connector implementations
            deployment_storage_connection_string: Azure Storage connection string
            deployment_container: Blob container for deployment packages
            code_repo_url: Git repository URL for connector code
            code_repo_branch: Git branch to use
            code_repo_username: Git username for authentication
            code_repo_password: Git password or token for authentication
        """
        self.connectors_dir = connectors_dir
        self.deployment_storage_connection_string = deployment_storage_connection_string
        self.deployment_container = deployment_container
        self.code_repo_url = code_repo_url
        self.code_repo_branch = code_repo_branch
        self.code_repo_username = code_repo_username
        self.code_repo_password = code_repo_password
        
        # Initialize blob client if storage is configured
        self.blob_service_client = None
        if deployment_storage_connection_string:
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    deployment_storage_connection_string
                )
            except Exception as e:
                logger.error(f"Failed to initialize blob client: {str(e)}")
        
        # Initialize connector tester
        self.connector_tester = ConnectorTester(connectors_dir=connectors_dir)
    
    async def deploy_connector(
        self,
        connector_name: str,
        target_environment: str = "development",
        run_tests: bool = True,
        test_config: Optional[Dict[str, Any]] = None,
        version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Deploy a connector to the target environment.
        
        Args:
            connector_name: Name of the connector to deploy
            target_environment: Target environment (development, staging, production)
            run_tests: Whether to run tests before deployment
            test_config: Configuration for tests if run_tests is True
            version: Specific version to deploy (default: latest)
            
        Returns:
            Deployment results
        """
        connector_path = os.path.join(self.connectors_dir, f"{connector_name}_connector")
        
        if not os.path.exists(connector_path):
            return {
                "success": False,
                "message": f"Connector not found: {connector_name}",
                "connector_name": connector_name,
                "target_environment": target_environment,
            }
        
        try:
            # Generate version if not provided
            if not version:
                version = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            # Run tests if required
            if run_tests:
                if not test_config:
                    test_config = {"config": {}, "credentials": {}}
                
                test_results = await self.connector_tester.test_connector(
                    connector_id=connector_name,
                    tenant_id="deployment_test_tenant",
                    test_config=test_config
                )
                
                # Check if tests passed
                tests_passed = all(result.success for result in test_results)
                if not tests_passed:
                    return {
                        "success": False,
                        "message": f"Connector tests failed for {connector_name}",
                        "connector_name": connector_name,
                        "target_environment": target_environment,
                        "test_results": [result.to_dict() for result in test_results],
                    }
            
            # Create deployment package
            deployment_package = await self._create_deployment_package(
                connector_name=connector_name,
                version=version,
                target_environment=target_environment
            )
            
            if not deployment_package:
                return {
                    "success": False,
                    "message": f"Failed to create deployment package for {connector_name}",
                    "connector_name": connector_name,
                    "target_environment": target_environment,
                }
            
            # Upload deployment package to blob storage
            if self.blob_service_client:
                upload_result = await self._upload_deployment_package(
                    deployment_package=deployment_package,
                    connector_name=connector_name,
                    version=version,
                    target_environment=target_environment
                )
                
                if not upload_result.get("success", False):
                    return {
                        "success": False,
                        "message": f"Failed to upload deployment package: {upload_result.get('message')}",
                        "connector_name": connector_name,
                        "target_environment": target_environment,
                        "version": version,
                    }
            
            # Commit to repository if configured
            if self.code_repo_url:
                commit_result = await self._commit_to_repository(
                    connector_name=connector_name,
                    version=version,
                    target_environment=target_environment
                )
                
                if not commit_result.get("success", False):
                    return {
                        "success": False,
                        "message": f"Failed to commit to repository: {commit_result.get('message')}",
                        "connector_name": connector_name,
                        "target_environment": target_environment,
                        "version": version,
                    }
            
            # Return success result
            return {
                "success": True,
                "message": f"Successfully deployed {connector_name} to {target_environment}",
                "connector_name": connector_name,
                "target_environment": target_environment,
                "version": version,
                "deployment_timestamp": datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Error deploying connector {connector_name}: {str(e)}")
            return {
                "success": False,
                "message": f"Error deploying connector: {str(e)}",
                "connector_name": connector_name,
                "target_environment": target_environment,
            }
    
    async def _create_deployment_package(
        self,
        connector_name: str,
        version: str,
        target_environment: str
    ) -> Optional[str]:
        """Create a deployment package for the connector.
        
        Args:
            connector_name: Name of the connector
            version: Deployment version
            target_environment: Target environment
            
        Returns:
            Path to the deployment package or None if failed
        """
        connector_path = os.path.join(self.connectors_dir, f"{connector_name}_connector")
        
        try:
            # Create a temporary directory
            temp_dir = tempfile.mkdtemp()
            package_dir = os.path.join(temp_dir, f"{connector_name}_connector")
            
            # Copy connector files
            shutil.copytree(connector_path, package_dir)
            
            # Create deployment metadata
            metadata = {
                "connector_name": connector_name,
                "version": version,
                "target_environment": target_environment,
                "created_at": datetime.utcnow().isoformat(),
                "frozen": True,
                "deployment_id": f"{connector_name}_{version}_{target_environment}"
            }
            
            # Write metadata file
            metadata_path = os.path.join(package_dir, "deployment_metadata.json")
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)
            
            # Create package archive
            package_name = f"{connector_name}_{version}_{target_environment}.zip"
            package_path = os.path.join(temp_dir, package_name)
            
            shutil.make_archive(
                os.path.join(temp_dir, f"{connector_name}_{version}_{target_environment}"),
                "zip",
                temp_dir,
                f"{connector_name}_connector"
            )
            
            # Copy the package to a persistent location
            output_dir = os.path.join(self.connectors_dir, "deployments")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, package_name)
            shutil.copy2(package_path, output_path)
            
            # Clean up
            shutil.rmtree(temp_dir)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating deployment package: {str(e)}")
            return None
    
    async def _upload_deployment_package(
        self,
        deployment_package: str,
        connector_name: str,
        version: str,
        target_environment: str
    ) -> Dict[str, Any]:
        """Upload deployment package to blob storage.
        
        Args:
            deployment_package: Path to the deployment package
            connector_name: Name of the connector
            version: Deployment version
            target_environment: Target environment
            
        Returns:
            Upload results
        """
        if not self.blob_service_client:
            return {
                "success": False,
                "message": "Blob service client not initialized",
            }
        
        try:
            # Ensure container exists
            try:
                container_client = self.blob_service_client.get_container_client(self.deployment_container)
                if not container_client.exists():
                    container_client = self.blob_service_client.create_container(self.deployment_container)
            except Exception as e:
                return {
                    "success": False,
                    "message": f"Failed to create or access container: {str(e)}",
                }
            
            # Define blob name
            blob_name = f"{target_environment}/{connector_name}/{connector_name}_{version}.zip"
            
            # Upload file
            blob_client = container_client.get_blob_client(blob_name)
            
            with open(deployment_package, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)
            
            # Create a latest pointer
            latest_blob_name = f"{target_environment}/{connector_name}/latest.txt"
            latest_blob_client = container_client.get_blob_client(latest_blob_name)
            latest_blob_client.upload_blob(version.encode("utf-8"), overwrite=True)
            
            return {
                "success": True,
                "message": "Successfully uploaded deployment package",
                "blob_url": blob_client.url,
            }
            
        except Exception as e:
            logger.error(f"Error uploading deployment package: {str(e)}")
            return {
                "success": False,
                "message": f"Error uploading deployment package: {str(e)}",
            }
    
    async def _commit_to_repository(
        self,
        connector_name: str,
        version: str,
        target_environment: str
    ) -> Dict[str, Any]:
        """Commit connector code to repository.
        
        Args:
            connector_name: Name of the connector
            version: Deployment version
            target_environment: Target environment
            
        Returns:
            Commit results
        """
        if not self.code_repo_url:
            return {
                "success": False,
                "message": "Repository URL not configured",
            }
        
        try:
            # Create a temporary directory
            temp_dir = tempfile.mkdtemp()
            
            try:
                # Set up git credentials if provided
                git_env = os.environ.copy()
                if self.code_repo_username and self.code_repo_password:
                    git_env["GIT_USERNAME"] = self.code_repo_username
                    git_env["GIT_PASSWORD"] = self.code_repo_password
                
                # Clone repository
                repo_url = self.code_repo_url
                if self.code_repo_username and self.code_repo_password:
                    # Insert credentials into URL
                    protocol, rest = repo_url.split("://", 1)
                    repo_url = f"{protocol}://{self.code_repo_username}:{self.code_repo_password}@{rest}"
                
                repo = git.Repo.clone_from(
                    repo_url,
                    temp_dir,
                    branch=self.code_repo_branch,
                    env=git_env
                )
                
                # Create a deployment branch
                branch_name = f"deploy/{connector_name}/{target_environment}/{version}"
                new_branch = repo.create_head(branch_name)
                new_branch.checkout()
                
                # Copy connector files
                connector_source = os.path.join(self.connectors_dir, f"{connector_name}_connector")
                connector_dest = os.path.join(temp_dir, "backend/functions/connectors", f"{connector_name}_connector")
                os.makedirs(os.path.dirname(connector_dest), exist_ok=True)
                
                if os.path.exists(connector_dest):
                    shutil.rmtree(connector_dest)
                    
                shutil.copytree(connector_source, connector_dest)
                
                # Create deployment metadata
                metadata = {
                    "connector_name": connector_name,
                    "version": version,
                    "target_environment": target_environment,
                    "created_at": datetime.utcnow().isoformat(),
                    "frozen": True,
                    "deployment_id": f"{connector_name}_{version}_{target_environment}"
                }
                
                # Write metadata file
                metadata_path = os.path.join(connector_dest, "deployment_metadata.json")
                with open(metadata_path, "w") as f:
                    json.dump(metadata, f, indent=2)
                
                # Add and commit changes
                repo.git.add(os.path.join("backend/functions/connectors", f"{connector_name}_connector"))
                
                commit_message = f"Deploy {connector_name} connector version {version} to {target_environment}"
                repo.git.commit(m=commit_message)
                
                # Push changes
                repo.git.push("origin", branch_name)
                
                return {
                    "success": True,
                    "message": "Successfully committed to repository",
                    "branch_name": branch_name,
                    "commit_message": commit_message,
                }
                
            finally:
                # Clean up
                shutil.rmtree(temp_dir)
                
        except Exception as e:
            logger.error(f"Error committing to repository: {str(e)}")
            return {
                "success": False,
                "message": f"Error committing to repository: {str(e)}",
            }
    
    async def rollback_deployment(
        self,
        connector_name: str,
        target_environment: str,
        version: Optional[str] = None
    ) -> Dict[str, Any]:
        """Rollback a connector deployment to a previous version.
        
        Args:
            connector_name: Name of the connector
            target_environment: Target environment
            version: Specific version to rollback to, or None for previous version
            
        Returns:
            Rollback results
        """
        try:
            # Get deployment history
            deployments = await self.get_deployment_history(
                connector_name=connector_name,
                target_environment=target_environment
            )
            
            if not deployments.get("success", False):
                return {
                    "success": False,
                    "message": f"Failed to get deployment history: {deployments.get('message')}",
                    "connector_name": connector_name,
                    "target_environment": target_environment,
                }
            
            history = deployments.get("deployments", [])
            if not history:
                return {
                    "success": False,
                    "message": f"No deployment history found for {connector_name}",
                    "connector_name": connector_name,
                    "target_environment": target_environment,
                }
            
            # Determine version to rollback to
            rollback_version = version
            
            if not rollback_version:
                # If no version specified, use the previous version
                if len(history) < 2:
                    return {
                        "success": False,
                        "message": f"No previous version found for {connector_name}",
                        "connector_name": connector_name,
                        "target_environment": target_environment,
                        "current_version": history[0].get("version"),
                    }
                
                rollback_version = history[1].get("version")  # Second entry is the previous version
            else:
                # Check if specified version exists
                if not any(d.get("version") == rollback_version for d in history):
                    return {
                        "success": False,
                        "message": f"Version {rollback_version} not found in deployment history",
                        "connector_name": connector_name,
                        "target_environment": target_environment,
                        "available_versions": [d.get("version") for d in history],
                    }
            
            # If we made it here, perform the rollback
            return await self.deploy_connector(
                connector_name=connector_name,
                target_environment=target_environment,
                run_tests=False,  # Skip tests for rollback
                version=f"{rollback_version}_rollback_{int(time.time())}"
            )
            
        except Exception as e:
            logger.error(f"Error rolling back deployment: {str(e)}")
            return {
                "success": False,
                "message": f"Error rolling back deployment: {str(e)}",
                "connector_name": connector_name,
                "target_environment": target_environment,
            }
    
    async def get_deployment_history(
        self,
        connector_name: str,
        target_environment: str
    ) -> Dict[str, Any]:
        """Get deployment history for a connector.
        
        Args:
            connector_name: Name of the connector
            target_environment: Target environment
            
        Returns:
            Deployment history
        """
        if not self.blob_service_client:
            return {
                "success": False,
                "message": "Blob service client not initialized",
                "deployments": [],
            }
        
        try:
            # List blobs in the container
            container_client = self.blob_service_client.get_container_client(self.deployment_container)
            
            # Define blob prefix
            blob_prefix = f"{target_environment}/{connector_name}/"
            
            # List blobs with prefix
            blobs = list(container_client.list_blobs(name_starts_with=blob_prefix))
            
            # Filter and parse blob names
            deployments = []
            
            for blob in blobs:
                if blob.name.endswith(".zip"):
                    parts = os.path.basename(blob.name).split("_")
                    if len(parts) >= 2:
                        version = parts[1].split(".")[0]
                        deployments.append({
                            "connector_name": connector_name,
                            "version": version,
                            "target_environment": target_environment,
                            "blob_name": blob.name,
                            "created_at": blob.creation_time.isoformat() if blob.creation_time else None,
                            "size_bytes": blob.size,
                        })
            
            # Sort by creation time (newest first)
            deployments.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            return {
                "success": True,
                "message": f"Found {len(deployments)} deployments for {connector_name} in {target_environment}",
                "deployments": deployments,
            }
            
        except Exception as e:
            logger.error(f"Error getting deployment history: {str(e)}")
            return {
                "success": False,
                "message": f"Error getting deployment history: {str(e)}",
                "deployments": [],
            } 