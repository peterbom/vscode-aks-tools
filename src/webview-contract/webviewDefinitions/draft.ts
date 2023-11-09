import { WebviewDefinition } from "../webviewTypes";

export type BuildConfigState = {
    dockerfilePath: string;
    dockerContextPath: string;
    port: number | null;
};

export type RepositoryDefinition = {
    resourceGroup: string;
    acrName: string;
    repositoryName: string;
    builtTags: string[];
};

export type ClusterDefinition = {
    resourceGroup: string;
    name: string;
};

export type AzureResourceState = {
    // Both ACR and cluster need to be in the same subscription for Draft functionality to work.
    subscriptionId: string;
    clusterDefinition: ClusterDefinition | null;
    repositoryDefinition: RepositoryDefinition | null;
};

export const deploymentSpecTypes = ["helm", "kustomize", "manifests"] as const;
export type DeploymentSpecType = typeof deploymentSpecTypes[number];

export type DeploymentSpecState = {
    type: DeploymentSpecType;
    path: string;
};

export type GitHubWorkflowState = {
    workflowPath: string;
};

export type ServiceState = {
    appName: string;
    buildConfig: BuildConfigState | null;
    deploymentSpec: DeploymentSpecState | null;
    gitHubWorkflow: GitHubWorkflowState | null;
};

export interface InitialState {
    workspaceName: string;
    azureResources: AzureResourceState | null;
    services: ServiceState[];
}

export type ToWebViewMsgDef = {};

export type ToVsCodeMsgDef = {};

export type DraftDefinition = WebviewDefinition<InitialState, ToVsCodeMsgDef, ToWebViewMsgDef>;