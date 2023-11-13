import { AcrKey, AcrName, ClusterName, ImageTag, RepositoryKey, RepositoryName, ResourceGroup, ResourceGroupKey, SavedClusterDefinition, SavedRepositoryDefinition, SavedService, Subscription, SubscriptionKey } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getOrThrow, replaceItem, updateValues } from "../utilities/array";
import { Lazy, isLoaded, map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../utilities/lazy";
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
};

export type ReferenceData = {
    subscriptions: Lazy<SubscriptionReferenceData[]>;
};

export type SubscriptionReferenceData = {
    subscription: Subscription;
    resourceGroups: Lazy<ResourceGroupReferenceData[]>;
};

export type ResourceGroupReferenceData = {
    name: ResourceGroup;
    acrs: Lazy<AcrReferenceData[]>;
    clusters: Lazy<ClusterReferenceData[]>;
};

export type AcrReferenceData = {
    name: AcrName;
    repositories: Lazy<RepositoryReferenceData[]>;
};

export type RepositoryReferenceData = {
    name: RepositoryName;
    builtTags: Lazy<string[]>;
};

export type ClusterReferenceData = {
    name: ClusterName;
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
        getSubscriptionsResponse: (state, subs) => ({...state, referenceData: ReferenceData.updateSubscriptions(state.referenceData, subs)}),
        getResourceGroupsResponse: (state, args) => ({...state, referenceData: ReferenceData.updateResourceGroups(state.referenceData, args.subscriptionId, args.groups)}),
        getAcrNamesResponse: (state, args) => ({...state, referenceData: ReferenceData.updateAcrNames(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrNames)}),
        getRepositoriesResponse: (state, args) => ({...state, referenceData: ReferenceData.updateRepositoryNames(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName, args.repositoryNames)}),
        getBuiltTagsResponse: (state, args) => ({...state, referenceData: ReferenceData.updateBuiltTags(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName, args.repositoryName, args.tags)}),
        getClustersResponse: (state, args) => ({...state, referenceData: ReferenceData.updateClusterNames(state.referenceData, args.subscriptionId, args.resourceGroup, args.clusterNames)})
    },
    eventHandler: {
        setSubscriptionsLoading: (state) => ({...state, referenceData: ReferenceData.setSubscriptionsLoading(state.referenceData)}),
        setResourceGroupsLoading: (state, args) => ({...state, referenceData: ReferenceData.setResourceGroupsLoading(state.referenceData, args.subscriptionId)}),
        setAcrsLoading: (state, args) => ({...state, referenceData: ReferenceData.setAcrsLoading(state.referenceData, args.subscriptionId, args.resourceGroup)}),
        setRepositoriesLoading: (state, args) => ({...state, referenceData: ReferenceData.setRepositoriesLoading(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName)}),
        setBuiltTagsLoading: (state, args) => ({...state, referenceData: ReferenceData.setBuiltTagsLoading(state.referenceData, args.subscriptionId, args.resourceGroup, args.acrName, args.repositoryName)}),
        setClustersLoading: (state, args) => ({...state, referenceData: ReferenceData.setClustersLoading(state.referenceData, args.subscriptionId, args.resourceGroup)}),
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
        setRepository: (state, repositoryDefinition) => ({...state, azureResources: {...state.azureResources, repositoryDefinition}})
    }
};

export function getSubscriptionReferenceData(data: ReferenceData, subscriptionId: string): Lazy<SubscriptionReferenceData> {
    return lazyMap(data.subscriptions, subs => getOrThrow(subs, sub => sub.subscription.id === subscriptionId, `Subscription ${subscriptionId}`));
}

export function getResourceGroupReferenceData(data: SubscriptionReferenceData, resourceGroup: ResourceGroup): Lazy<ResourceGroupReferenceData> {
    return lazyMap(data.resourceGroups, groups => getOrThrow(groups, group => group.name === resourceGroup, `Group ${resourceGroup} subscription ${data.subscription.id}`));
}

export function getAcrReferenceData(data: ResourceGroupReferenceData, acrName: AcrName): Lazy<AcrReferenceData> {
    return lazyMap(data.acrs, acrs => getOrThrow(acrs, acr => acr.name === acrName, `ACR ${acrName} in resource group ${data.name}`));
}

namespace ReferenceData {
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
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.setResourceGroupsLoading(sub));
    }

    export function updateResourceGroups(data: ReferenceData, subscriptionId: string, resourceGroups: ResourceGroup[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.updateResourceGroups(sub, resourceGroups));
    }

    export function setAcrsLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.setAcrsLoading(sub, resourceGroup));
    }

    export function updateAcrNames(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrNames: AcrName[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.updateAcrNames(sub, resourceGroup, acrNames));
    }

    export function setRepositoriesLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.setRepositoriesLoading(sub, resourceGroup, acrName));
    }

    export function updateRepositoryNames(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName, repositoryNames: RepositoryName[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.updateRepositoryNames(sub, resourceGroup, acrName, repositoryNames));
    }

    export function setBuiltTagsLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.setBuiltTagsLoading(sub, resourceGroup, acrName, repositoryName));
    }

    export function updateBuiltTags(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName, tags: string[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.updateBuiltTags(sub, resourceGroup, acrName, repositoryName, tags));
    }

    export function setClustersLoading(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.setClustersLoading(sub, resourceGroup));
    }

    export function updateClusterNames(data: ReferenceData, subscriptionId: string, resourceGroup: ResourceGroup, clusterNames: ClusterName[]): ReferenceData {
        return updateSubscription(data, subscriptionId, sub => SubscriptionData.updateClusterNames(sub, resourceGroup, clusterNames));
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

namespace SubscriptionData {
    export function setResourceGroupsLoading(data: SubscriptionReferenceData): SubscriptionReferenceData {
        return {...data, resourceGroups: newLoading()};
    }

    export function updateResourceGroups(data: SubscriptionReferenceData, resourceGroups: ResourceGroup[]): SubscriptionReferenceData {
        const existingGroups = orDefault(data.resourceGroups, []);
        const updatedGroups = updateValues(existingGroups, resourceGroups, group => group.name, group => ({
            name: group,
            acrs: newNotLoaded(),
            clusters: newNotLoaded()
        }));

        return {
            ...data,
            resourceGroups: newLoaded(updatedGroups)
        };
    }

    export function setAcrsLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.setAcrsLoading(group));
    }

    export function updateAcrNames(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrNames: AcrName[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.updateAcrNames(group, acrNames));
    }

    export function setRepositoriesLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.setRepositoriesLoading(group, acrName));
    }

    export function updateRepositoryNames(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName, repositoryNames: RepositoryName[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.updateRepositoryNames(group, acrName, repositoryNames));
    }

    export function setBuiltTagsLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.setBuiltTagsLoading(group, acrName, repositoryName));
    }

    export function updateBuiltTags(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, acrName: AcrName, repositoryName: RepositoryName, tags: string[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.updateBuiltTags(group, acrName, repositoryName, tags));
    }

    export function setClustersLoading(data: SubscriptionReferenceData, resourceGroup: ResourceGroup): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.setClustersLoading(group));
    }

    export function updateClusterNames(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, clusterNames: ClusterName[]): SubscriptionReferenceData {
        return updateResourceGroup(data, resourceGroup, group => ResourceGroupData.updateClusterNames(group, clusterNames));
    }

    function updateResourceGroup(data: SubscriptionReferenceData, resourceGroup: ResourceGroup, updater: (data: ResourceGroupReferenceData) => ResourceGroupReferenceData): SubscriptionReferenceData {
        return {
            ...data,
            resourceGroups: lazyMap(data.resourceGroups, groups => replaceItem(
                groups,
                group => group.name === resourceGroup,
                updater
            ))
        };
    }
}

namespace ResourceGroupData {
    export function setAcrsLoading(data: ResourceGroupReferenceData): ResourceGroupReferenceData {
        return {...data, acrs: newLoading()};
    }

    export function setClustersLoading(data: ResourceGroupReferenceData): ResourceGroupReferenceData {
        return {...data, clusters: newLoading()};
    }

    export function updateAcrNames(data: ResourceGroupReferenceData, acrNames: AcrName[]): ResourceGroupReferenceData {
        const existingAcrs = orDefault(data.acrs, []);
        const updatedAcrs = updateValues(existingAcrs, acrNames, acr => acr.name, name => ({
            name,
            repositories: newNotLoaded()
        }));

        return {
            ...data,
            acrs: newLoaded(updatedAcrs)
        };
    }

    export function updateClusterNames(data: ResourceGroupReferenceData, clusterNames: ClusterName[]): ResourceGroupReferenceData {
        const existingClusters = orDefault(data.clusters, []);
        const updatedClusters = updateValues(existingClusters, clusterNames, cluster => cluster.name, name => ({
            name,
            connectedAcrs: newNotLoaded()
        }));

        return {
            ...data,
            clusters: newLoaded(updatedClusters)
        };
    }

    export function setRepositoriesLoading(data: ResourceGroupReferenceData, acrName: AcrName): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrData.setRepositoriesLoading(acr));
    }

    export function updateRepositoryNames(data: ResourceGroupReferenceData, acrName: AcrName, repositoryNames: RepositoryName[]): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrData.updateRepositoryNames(acr, repositoryNames));
    }

    export function setBuiltTagsLoading(data: ResourceGroupReferenceData, acrName: AcrName, repositoryName: RepositoryName): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrData.setBuiltTagsLoading(acr, repositoryName));
    }

    export function updateBuiltTags(data: ResourceGroupReferenceData, acrName: AcrName, repositoryName: RepositoryName, tags: string[]): ResourceGroupReferenceData {
        return updateAcr(data, acrName, acr => AcrData.updateBuiltTags(acr, repositoryName, tags));
    }

    function updateAcr(data: ResourceGroupReferenceData, acrName: AcrName, updater: (data: AcrReferenceData) => AcrReferenceData): ResourceGroupReferenceData {
        return {
            ...data,
            acrs: lazyMap(data.acrs, acrs => replaceItem(
                acrs,
                acr => acr.name === acrName,
                updater
            ))
        };
    }
};

namespace AcrData {
    export function setRepositoriesLoading(data: AcrReferenceData): AcrReferenceData {
        return {...data, repositories: newLoading()};
    }

    export function updateRepositoryNames(data: AcrReferenceData, repositoryNames: RepositoryName[]): AcrReferenceData {
        const existingRepos = orDefault(data.repositories, []);
        const updatedRepos = updateValues(existingRepos, repositoryNames, repo => repo.name, name => ({
            name,
            builtTags: newNotLoaded()
        }));

        return {
            ...data,
            repositories: newLoaded(updatedRepos)
        };
    }

    export function setBuiltTagsLoading(data: AcrReferenceData, repositoryName: RepositoryName): AcrReferenceData {
        return updateRepository(data, repositoryName, repository => RepositoryData.setBuiltTagsLoading(repository));
    }

    export function updateBuiltTags(data: AcrReferenceData, repositoryName: RepositoryName, tags: string[]): AcrReferenceData {
        return updateRepository(data, repositoryName, repository => RepositoryData.updateBuiltTags(repository, tags));
    }

    function updateRepository(data: AcrReferenceData, repositoryName: RepositoryName, updater: (data: RepositoryReferenceData) => RepositoryReferenceData): AcrReferenceData {
        return {
            ...data,
            repositories: lazyMap(data.repositories, repositories => replaceItem(
                repositories,
                repository => repository.name === repositoryName,
                updater
            ))
        };
    }
}

namespace RepositoryData {
    export function setBuiltTagsLoading(data: RepositoryReferenceData): RepositoryReferenceData {
        return {...data, builtTags: newLoading()};
    }

    export function updateBuiltTags(data: RepositoryReferenceData, tags: string[]): RepositoryReferenceData {
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