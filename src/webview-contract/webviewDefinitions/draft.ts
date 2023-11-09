import { WebviewDefinition } from "../webviewTypes";

export type SavedBuildConfig = {
    dockerfilePath: string;
    dockerContextPath: string;
    port: number | null;
};

export type SavedRepositoryDefinition = {
    resourceGroup: ResourceGroup;
    acrName: AcrName;
    repositoryName: RepositoryName;
};

export type SavedClusterDefinition = {
    resourceGroup: ResourceGroup;
    name: ClusterName;
};

export type Subscription = {
    id: string;
    name: string;
};

export type ResourceGroup = string;

export type AcrName = string;

export type RepositoryName = string;

export type ImageTag = string;

export type ClusterName = string;

export type SavedAzureResources = {
    // Both ACR and cluster need to be in the same subscription for Draft functionality to work.
    subscription: Subscription;
    clusterDefinition: SavedClusterDefinition | null;
    repositoryDefinition: SavedRepositoryDefinition | null;
};

export const deploymentSpecTypes = ["helm", "kustomize", "manifests"] as const;
export type DeploymentSpecType = (typeof deploymentSpecTypes)[number];

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

export type SubscriptionKey = {
    subscriptionId: string;
};

export type ResourceGroupKey = SubscriptionKey & {
    resourceGroup: ResourceGroup;
};

export type AcrKey = ResourceGroupKey & {
    acrName: AcrName;
};

export type ClusterKey = ResourceGroupKey & {
    clusterName: ClusterName;
};

export type RepositoryKey = AcrKey & {
    repositoryName: RepositoryName;
};

export interface InitialState {
    workspaceName: string;
    savedAzureResources: SavedAzureResources | null;
    savedServices: SavedService[];
}

export type ToWebViewMsgDef = {
    getSubscriptionsResponse: Subscription[];
    getResourceGroupsResponse: SubscriptionKey & {
        groups: ResourceGroup[];
    };
    getAcrNamesResponse: ResourceGroupKey & {
        acrNames: AcrName[];
    };
    getRepositoriesResponse: AcrKey & {
        repositoryNames: RepositoryName[];
    };
    getBuiltTagsResponse: RepositoryKey & {
        tags: ImageTag[];
    };
    getClustersResponse: ResourceGroupKey & {
        clusterNames: ClusterName[];
    };
    getConnectedAcrsResponse: ClusterKey & {
        acrs: AcrKey[];
    };
};

export type ToVsCodeMsgDef = {
    createNewService: string;
    getSubscriptionsRequest: void;
    getResourceGroupsRequest: SubscriptionKey;
    getAcrNamesRequest: ResourceGroupKey;
    getRepositoriesRequest: AcrKey;
    getBuiltTagsRequest: RepositoryKey;
    getClustersRequest: ResourceGroupKey;
    getConnectedAcrsRequest: ClusterKey;
};

export type DraftDefinition = WebviewDefinition<InitialState, ToVsCodeMsgDef, ToWebViewMsgDef>;
