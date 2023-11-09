import {
    AcrKey,
    ClusterKey,
    ImageTag,
    RepositoryKey,
    ResourceGroupKey,
    SavedClusterDefinition,
    SavedRepositoryDefinition,
    SavedService,
    Subscription,
    SubscriptionKey,
} from "../../../src/webview-contract/webviewDefinitions/draft";
import { Lazy, newNotLoaded } from "../utilities/lazy";
import { WebviewStateUpdater } from "../utilities/state";
import { getWebviewMessageContext } from "../utilities/vscode";
import * as ReferenceDataUpdate from "./state/referenceDataUpdate";

export type EventDef = {
    setSubscriptionsLoading: void;
    setResourceGroupsLoading: SubscriptionKey;
    setAcrsLoading: ResourceGroupKey;
    setRepositoriesLoading: AcrKey;
    setBuiltTagsLoading: RepositoryKey;
    setClustersLoading: ResourceGroupKey;
    setConnectedAcrsLoading: ClusterKey;
    setNewServiceDialogShown: boolean;
    createNewService: string;
    setSelectedService: string | null;
    setSubscription: Subscription | null;
    setSubscriptionDialogShown: boolean;
    setRepositoryDialogShown: boolean;
    setClusterDialogShown: boolean;
    setRepository: SavedRepositoryDefinition | null;
    setCluster: SavedClusterDefinition | null;
};

export type ReferenceData = {
    subscriptions: Lazy<SubscriptionReferenceData[]>;
};

export type SubscriptionReferenceData = {
    subscription: Subscription;
    resourceGroups: Lazy<ResourceGroupReferenceData[]>;
};

export type ResourceGroupReferenceData = {
    key: ResourceGroupKey;
    acrs: Lazy<AcrReferenceData[]>;
    clusters: Lazy<ClusterReferenceData[]>;
};

export type AcrReferenceData = {
    key: AcrKey;
    repositories: Lazy<RepositoryReferenceData[]>;
};

export type RepositoryReferenceData = {
    key: RepositoryKey;
    builtTags: Lazy<ImageTag[]>;
};

export type ClusterReferenceData = {
    key: ClusterKey;
    connectedAcrs: Lazy<AcrKey[]>;
};

export type AzureResourcesState = {
    selectedSubscription: Subscription | null;
    clusterDefinition: SavedClusterDefinition | null;
    repositoryDefinition: SavedRepositoryDefinition | null;
    isSubscriptionDialogShown: boolean;
    isRepositoryDialogShown: boolean;
    isClusterDialogShown: boolean;
};

export type ServicesState = SavedService;

export type DraftState = {
    workspaceName: string;
    referenceData: ReferenceData;
    azureResources: AzureResourcesState;
    services: ServicesState[];
    selectedService: string | null;
    isNewServiceDialogShown: boolean;
};

export const stateUpdater: WebviewStateUpdater<"draft", EventDef, DraftState> = {
    createState: (initialState) => ({
        workspaceName: initialState.workspaceName,
        referenceData: {
            subscriptions: newNotLoaded(),
        },
        azureResources: {
            selectedSubscription: initialState.savedAzureResources?.subscription || null,
            clusterDefinition: initialState.savedAzureResources?.clusterDefinition || null,
            repositoryDefinition: initialState.savedAzureResources?.repositoryDefinition || null,
            isSubscriptionDialogShown: false,
            isRepositoryDialogShown: false,
            isClusterDialogShown: false,
        },
        services: initialState.savedServices,
        selectedService: initialState.savedServices.length === 1 ? initialState.savedServices[0].name : null,
        isNewServiceDialogShown: false,
    }),
    vscodeMessageHandler: {
        getSubscriptionsResponse: (state, subs) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateSubscriptions(state.referenceData, subs),
        }),
        getResourceGroupsResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateResourceGroups(
                state.referenceData,
                args.subscriptionId,
                args.groups,
            ),
        }),
        getAcrNamesResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateAcrNames(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrNames,
            ),
        }),
        getRepositoriesResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateRepositoryNames(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
                args.repositoryNames,
            ),
        }),
        getBuiltTagsResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateBuiltTags(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
                args.repositoryName,
                args.tags,
            ),
        }),
        getClustersResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateClusterNames(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.clusterNames,
            ),
        }),
        getConnectedAcrsResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateConnectedAcrs(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.clusterName,
                args.acrs,
            ),
        }),
    },
    eventHandler: {
        setSubscriptionsLoading: (state) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setSubscriptionsLoading(state.referenceData),
        }),
        setResourceGroupsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setResourceGroupsLoading(state.referenceData, args.subscriptionId),
        }),
        setAcrsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setAcrsLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
            ),
        }),
        setRepositoriesLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setRepositoriesLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
            ),
        }),
        setBuiltTagsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setBuiltTagsLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
                args.repositoryName,
            ),
        }),
        setClustersLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setClustersLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
            ),
        }),
        setConnectedAcrsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setConnectedAcrsLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.clusterName,
            ),
        }),
        setNewServiceDialogShown: (state, shown) => ({ ...state, isNewServiceDialogShown: shown }),
        createNewService: (state, name) => ({
            ...state,
            selectedService: name,
            isNewServiceDialogShown: false,
            services: [
                ...state.services,
                {
                    name,
                    buildConfig: null,
                    deploymentSpec: null,
                    gitHubWorkflow: null,
                },
            ],
        }),
        setSelectedService: (state, selectedService) => ({ ...state, selectedService }),
        setSubscription: (state, subscription) => ({
            ...state,
            azureResources: {
                ...state.azureResources,
                selectedSubscription: subscription,
                clusterDefinition: null,
                repositoryDefinition: null,
            },
        }),
        setSubscriptionDialogShown: (state, shown) => ({
            ...state,
            azureResources: { ...state.azureResources, isSubscriptionDialogShown: shown },
        }),
        setRepositoryDialogShown: (state, shown) => ({
            ...state,
            azureResources: { ...state.azureResources, isRepositoryDialogShown: shown },
        }),
        setClusterDialogShown: (state, shown) => ({
            ...state,
            azureResources: { ...state.azureResources, isClusterDialogShown: shown },
        }),
        setRepository: (state, repositoryDefinition) => ({
            ...state,
            azureResources: { ...state.azureResources, repositoryDefinition },
        }),
        setCluster: (state, clusterDefinition) => ({
            ...state,
            azureResources: { ...state.azureResources, clusterDefinition },
        }),
    },
};

export const vscode = getWebviewMessageContext<"draft">({
    createNewService: null,
    getSubscriptionsRequest: null,
    getResourceGroupsRequest: null,
    getAcrNamesRequest: null,
    getRepositoriesRequest: null,
    getBuiltTagsRequest: null,
    getClustersRequest: null,
    getConnectedAcrsRequest: null,
});
