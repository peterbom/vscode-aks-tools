import { WebviewDefinition } from "../webviewTypes";

export type SavedBuildConfig = {
    dockerfilePath: string;
    dockerContextPath: string;
    port: number | null;
};

export type SavedRepositoryDefinition = {
    resourceGroup: string;
    acrName: string;
    repositoryName: string;
    builtTags: string[];
};

export type SavedClusterDefinition = {
    resourceGroup: string;
    name: string;
};

export type Subscription = {
    id: string;
    name: string;
};

export type SavedAzureResources = {
    // Both ACR and cluster need to be in the same subscription for Draft functionality to work.
    subscription: Subscription;
    clusterDefinition: SavedClusterDefinition | null;
    repositoryDefinition: SavedRepositoryDefinition | null;
};

export const deploymentSpecTypes = ["helm", "kustomize", "manifests"] as const;
export type DeploymentSpecType = typeof deploymentSpecTypes[number];

export type SavedDeploymentSpec = {
    type: DeploymentSpecType;
    path: string;
};

export type SavedGitHubWorkflow = {
    workflowPath: string;
};

export type SavedService = {
    name: string;
    buildConfig: SavedBuildConfig | null;
    deploymentSpec: SavedDeploymentSpec | null;
    gitHubWorkflow: SavedGitHubWorkflow | null;
};

export interface InitialState {
    workspaceName: string;
    savedAzureResources: SavedAzureResources | null;
    savedServices: SavedService[];
}

export type ToWebViewMsgDef = {
    getSubscriptionsResponse: Subscription[];
};

export type ToVsCodeMsgDef = {
    createNewService: string;
    getSubscriptionsRequest: void;
};

export type DraftDefinition = WebviewDefinition<InitialState, ToVsCodeMsgDef, ToWebViewMsgDef>;