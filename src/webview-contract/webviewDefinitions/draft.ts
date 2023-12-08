import { WebviewDefinition } from "../webviewTypes";
import { OpenFileOptions, OpenFileResult, SaveFileOptions, SaveFileResult } from "./shared/fileSystemTypes";

export type WorkspaceConfig = {
    name: string;
    fullPath: string;
    pathSeparator: string;
};

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
    relativePath: string;
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

export enum PickFileSituation {
    DockerfilePath,
}

export enum PickFolderSituation {
    NewServicePath,
    DeploymentSpecPath,
    GitHubWorkflowFilePath,
}

export interface InitialState {
    workspaceConfig: WorkspaceConfig;
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
    pickFileResponse: { situation: PickFileSituation; result: SaveFileResult };
    pickFolderResponse: { situation: PickFolderSituation; result: OpenFileResult };
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
    pickFileRequest: { situation: PickFileSituation; options: SaveFileOptions };
    pickFolderRequest: { situation: PickFolderSituation; options: OpenFileOptions };
};

export type DraftDefinition = WebviewDefinition<InitialState, ToVsCodeMsgDef, ToWebViewMsgDef>;
