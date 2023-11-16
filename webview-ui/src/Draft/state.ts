import { AcrKey, AcrName, ClusterKey, ClusterName, ImageTag, RepositoryKey, RepositoryName, ResourceGroup, ResourceGroupKey, SavedClusterDefinition, SavedRepositoryDefinition, SavedService, Subscription, SubscriptionKey } from "../../../src/webview-contract/webviewDefinitions/draft";
import { replaceItem, updateValues } from "../utilities/array";
import { Lazy, map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../utilities/lazy";
import { WebviewStateUpdater } from "../utilities/state";
import { getWebviewMessageContext } from "../utilities/vscode";

export type EventDef = {
    setSubscriptionsLoading: void;
    setResourceGroupsLoading: SubscriptionKey;
    setAcrsLoading: ResourceGroupKey;
    setRepositoriesLoading: AcrKey;
    setBuiltTagsLoading: RepositoryKey;
    setClustersLoading: ResourceGroupKey;
    setNewServiceDialogShown: boolean;
    createNewService: string;
    setSelectedService: string | null;
    setSubscription: Subscription | null;
    setRepositoryDialogShown: boolean;
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
}

export type AzureResourcesState = {
    selectedSubscription: Subscription | null;
    clusterDefinition: SavedClusterDefinition | null;
    repositoryDefinition: SavedRepositoryDefinition | null;
    isRepositoryDialogShown: boolean;
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
    createState: initialState => ({
        workspaceName: initialState.workspaceName,
        referenceData: {
            subscriptions: newNotLoaded()
        },
        azureResources: {
            selectedSubscription: initialState.savedAzureResources?.subscription || null,
            clusterDefinition: initialState.savedAzureResources?.clusterDefinition || null,
            repositoryDefinition: initialState.savedAzureResources?.repositoryDefinition || null,
            isRepositoryDialogShown: false
        },
        services: initialState.savedServices,
        selectedService: initialState.savedServices.length === 1 ? initialState.savedServices[0].name : null,
        isNewServiceDialogShown: false
    }),
    vscodeMessageHandler: {
        getSubscriptionsResponse: (state, subs) => ({...state, referenceData: ReferenceDataUpdate.updateSubscriptions(state.referenceData, subs)}),
        getResourceGroupsResponse: (state, args) => ({...state, referenceData: ReferenceDataUpdate.updateResourceGroups(state.referenceData, args.subscriptionId, args.groups)}),
        getAcrNamesResponse: (state, args) => ({...state, referenceData: ReferenceDataUpdate.updateAcrNames(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrNames)}),
        getRepositoriesResponse: (state, args) => ({...state, referenceData: ReferenceDataUpdate.updateRepositoryNames(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName, args.repositoryNames)}),
        getBuiltTagsResponse: (state, args) => ({...state, referenceData: ReferenceDataUpdate.updateBuiltTags(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName, args.repositoryName, args.tags)}),
        getClustersResponse: (state, args) => ({...state, referenceData: ReferenceDataUpdate.updateClusterNames(state.referenceData, args.subscriptionId, args.resourceGroup, args.clusterNames)})
    },
    eventHandler: {
        setSubscriptionsLoading: (state) => ({...state, referenceData: ReferenceDataUpdate.setSubscriptionsLoading(state.referenceData)}),
        setResourceGroupsLoading: (state, args) => ({...state, referenceData: ReferenceDataUpdate.setResourceGroupsLoading(state.referenceData, args.subscriptionId)}),
        setAcrsLoading: (state, args) => ({...state, referenceData: ReferenceDataUpdate.setAcrsLoading(state.referenceData, args.subscriptionId, args.resourceGroup)}),
        setRepositoriesLoading: (state, args) => ({...state, referenceData: ReferenceDataUpdate.setRepositoriesLoading(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName)}),
        setBuiltTagsLoading: (state, args) => ({...state, referenceData: ReferenceDataUpdate.setBuiltTagsLoading(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName, args.repositoryName)}),
        setClustersLoading: (state, args) => ({...state, referenceData: ReferenceDataUpdate.setClustersLoading(state.referenceData, args.subscriptionId, args.resourceGroup)}),
        setNewServiceDialogShown: (state, shown) => ({...state, isNewServiceDialogShown: shown}),
        createNewService: (state, name) => ({...state, selectedService: name, isNewServiceDialogShown: false, services: [...state.services, {
            name,
            buildConfig: null,
            deploymentSpec: null,
            gitHubWorkflow: null
        }]}),
        setSelectedService: (state, selectedService) => ({...state, selectedService}),
        setSubscription: (state, subscription) => ({...state, azureResources: {...state.azureResources, selectedSubscription: subscription, clusterDefinition: null, repositoryDefinition: null}}),
        setRepositoryDialogShown: (state, shown) => ({...state, azureResources: {...state.azureResources, isRepositoryDialogShown: shown}}),
        setRepository: (state, repositoryDefinition) => ({...state, azureResources: {...state.azureResources, repositoryDefinition}}),
        setCluster: (state, clusterDefinition) => ({...state, azureResources: {...state.azureResources, clusterDefinition}})
    }
};

namespace ReferenceDataUpdate {
    export function setSubscriptionsLoading(data: ReferenceData): ReferenceData {
        return {...data, subscriptions: newLoading()};
    }

    export function updateSubscriptions(data: ReferenceData, subscriptions: Subscription[]): ReferenceData {
        const existingSubs = orDefault(data.subscriptions, []);
        const updatedSubs = updateValues(existingSubs, subscriptions, sub => sub.subscription, subscription => ({
            subscription,
            resourceGroups: newNotLoaded()
        }));

        return {
            ...data,
            subscriptions: newLoaded(updatedSubs)
        };
    }

    export function setResourceGroupsLoading(data: ReferenceData, subscriptionId: string): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.setResourceGroupsLoading(sub));
    }

    export function updateResourceGroups(data: ReferenceData, subscriptionId: string, resourceGroups: ResourceGroup[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.updateResourceGroups(sub, resourceGroups));
    }

    export function setAcrsLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.setAcrsLoading(sub, resourceGroup));
    }

    export function updateAcrNames(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrNames: AcrName[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.updateAcrNames(sub, resourceGroup, acrNames));
    }

    export function setRepositoriesLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.setRepositoriesLoading(sub, resourceGroup, acrName));
    }

    export function updateRepositoryNames(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName, repositoryNames: RepositoryName[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.updateRepositoryNames(sub, resourceGroup, acrName, repositoryNames));
    }

    export function setBuiltTagsLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.setBuiltTagsLoading(sub, resourceGroup, acrName, repositoryName));
    }

    export function updateBuiltTags(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName, tags: string[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.updateBuiltTags(sub, resourceGroup, acrName, repositoryName, tags));
    }

    export function setClustersLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.setClustersLoading(sub, resourceGroup));
    }

    export function updateClusterNames(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, clusterNames: ClusterName[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionDataUpdate.updateClusterNames(sub, resourceGroup, clusterNames));
    }

    function updateSubscription(data: ReferenceData, subscriptionId: string, updater: (data: SubscriptionReferenceData) => SubscriptionReferenceData): ReferenceData {
        return {
            ...data,
            subscriptions: lazyMap(data.subscriptions, subs => replaceItem(
                subs,
                sub => sub.subscription.id === subscriptionId,
                updater
            ))
        };
    }
}

namespace SubscriptionDataUpdate {
    export function setResourceGroupsLoading(data: SubscriptionReferenceData): SubscriptionReferenceData {
        return {...data, resourceGroups: newLoading()};
    }

    export function updateResourceGroups(data: SubscriptionReferenceData, resourceGroups: ResourceGroup[]): SubscriptionReferenceData {
        const existingGroups = orDefault(data.resourceGroups, []);
        const newKeys: ResourceGroupKey[] = resourceGroups.map(resourceGroup => ({subscriptionId: data.subscription.id, resourceGroup}));
        const updatedGroups = updateValues(existingGroups, newKeys, group => group.key, key => ({
            key,
            acrs: newNotLoaded(),
            clusters: newNotLoaded()
        }));

        return {
            ...data,
            resourceGroups: newLoaded(updatedGroups)
        };
    }

    export function setAcrsLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.setAcrsLoading(group));
    }

    export function updateAcrNames(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrNames: AcrName[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.updateAcrNames(group, acrNames));
    }

    export function setRepositoriesLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.setRepositoriesLoading(group, acrName));
    }

    export function updateRepositoryNames(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName, repositoryNames: RepositoryName[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.updateRepositoryNames(group, acrName, repositoryNames));
    }

    export function setBuiltTagsLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.setBuiltTagsLoading(group, acrName, repositoryName));
    }

    export function updateBuiltTags(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName, tags: string[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.updateBuiltTags(group, acrName, repositoryName, tags));
    }

    export function setClustersLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.setClustersLoading(group));
    }

    export function updateClusterNames(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, clusterNames: ClusterName[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupDataUpdate.updateClusterNames(group, clusterNames));
    }

    function updateResourceGroup(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, updater: (data: ResourceGroupReferenceData) => ResourceGroupReferenceData): SubscriptionReferenceData {
        return {
            ...data,
            resourceGroups: lazyMap(data.resourceGroups, groups => replaceItem(
                groups,
                group => group.key.resourceGroup === resourceGroup,
                updater
            ))
        };
    }
}

namespace ResourceGroupDataUpdate {
    export function setAcrsLoading(data: ResourceGroupReferenceData): ResourceGroupReferenceData {
        return {...data, acrs: newLoading()};
    }

    export function setClustersLoading(data: ResourceGroupReferenceData): ResourceGroupReferenceData {
        return {...data, clusters: newLoading()};
    }

    export function updateAcrNames(data: ResourceGroupReferenceData, acrNames: AcrName[]): ResourceGroupReferenceData {
        const existingAcrs = orDefault(data.acrs, []);
        const newKeys: AcrKey[] = acrNames.map(acrName => ({...data.key, acrName}));
        const updatedAcrs = updateValues(existingAcrs, newKeys, acr => acr.key, key => ({
            key,
            repositories: newNotLoaded()
        }));

        return {
            ...data,
            acrs: newLoaded(updatedAcrs)
        };
    }

    export function updateClusterNames(data: ResourceGroupReferenceData, clusterNames: ClusterName[]): ResourceGroupReferenceData {
        const existingClusters = orDefault(data.clusters, []);
        const newKeys: ClusterKey[] = clusterNames.map(clusterName => ({...data.key, clusterName}));
        const updatedClusters = updateValues(existingClusters, newKeys, cluster => cluster.key, key => ({
            key,
            connectedAcrs: newNotLoaded()
        }));

        return {
            ...data,
            clusters: newLoaded(updatedClusters)
        };
    }

    export function setRepositoriesLoading(data: ResourceGroupReferenceData, acrName: AcrName): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrDataUpdate.setRepositoriesLoading(acr));
    }

    export function updateRepositoryNames(data: ResourceGroupReferenceData, acrName: AcrName, repositoryNames: RepositoryName[]): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrDataUpdate.updateRepositoryNames(acr, repositoryNames));
    }

    export function setBuiltTagsLoading(data: ResourceGroupReferenceData, acrName: AcrName, repositoryName: RepositoryName): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrDataUpdate.setBuiltTagsLoading(acr, repositoryName));
    }

    export function updateBuiltTags(data: ResourceGroupReferenceData, acrName: AcrName, repositoryName: RepositoryName, tags: string[]): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrDataUpdate.updateBuiltTags(acr, repositoryName, tags));
    }

    function updateAcr(data: ResourceGroupReferenceData, acrName: AcrName, updater: (data: AcrReferenceData) => AcrReferenceData): ResourceGroupReferenceData {
        return {
            ...data,
            acrs: lazyMap(data.acrs, acrs => replaceItem(
                acrs,
                acr => acr.key.acrName === acrName,
                updater
            ))
        };
    }
};

namespace AcrDataUpdate {
    export function setRepositoriesLoading(data: AcrReferenceData): AcrReferenceData {
        return {...data, repositories: newLoading()};
    }

    export function updateRepositoryNames(data: AcrReferenceData, repositoryNames: RepositoryName[]): AcrReferenceData {
        const existingRepos = orDefault(data.repositories, []);
        const newKeys: RepositoryKey[] = repositoryNames.map(repositoryName => ({...data.key, repositoryName}));
        const updatedRepos = updateValues(existingRepos, newKeys, repo => repo.key, key => ({
            key,
            builtTags: newNotLoaded()
        }));

        return {
            ...data,
            repositories: newLoaded(updatedRepos)
        };
    }

    export function setBuiltTagsLoading(data: AcrReferenceData, repositoryName: RepositoryName): AcrReferenceData {
        return updateRepository(data, repositoryName, repository => RepositoryDataUpdate.setBuiltTagsLoading(repository));
    }

    export function updateBuiltTags(data: AcrReferenceData, repositoryName: RepositoryName, tags: string[]): AcrReferenceData {
        return updateRepository(data, repositoryName, repository => RepositoryDataUpdate.updateBuiltTags(repository, tags));
    }

    function updateRepository(data: AcrReferenceData, repositoryName: RepositoryName, updater: (data: RepositoryReferenceData) => RepositoryReferenceData): AcrReferenceData {
        return {
            ...data,
            repositories: lazyMap(data.repositories, repositories => replaceItem(
                repositories,
                repository => repository.key.repositoryName === repositoryName,
                updater
            ))
        };
    }
}

namespace RepositoryDataUpdate {
    export function setBuiltTagsLoading(data: RepositoryReferenceData): RepositoryReferenceData {
        return {...data, builtTags: newLoading()};
    }

    export function updateBuiltTags(data: RepositoryReferenceData, tags: ImageTag[]): RepositoryReferenceData {
        return {
            ...data,
            builtTags: newLoaded(tags)
        };
    }
}

export const vscode = getWebviewMessageContext<"draft">({
    createNewService: null,
    getSubscriptionsRequest: null,
    getResourceGroupsRequest: null,
    getAcrNamesRequest: null,
    getRepositoriesRequest: null,
    getBuiltTagsRequest: null,
    getClustersRequest: null
});