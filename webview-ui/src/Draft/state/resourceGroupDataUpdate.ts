import {
    AcrKey,
    AcrName,
    ClusterKey,
    ClusterName,
    RepositoryName,
} from "../../../../src/webview-contract/webviewDefinitions/draft";
import { replaceItem, updateValues } from "../../utilities/array";
import { map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../../utilities/lazy";
import { AcrReferenceData, ClusterReferenceData, ResourceGroupReferenceData } from "../state";
import * as AcrDataUpdate from "./acrDataUpdate";
import * as ClusterDataUpdate from "./clusterDataUpdate";

export function setAcrsLoading(data: ResourceGroupReferenceData): ResourceGroupReferenceData {
    return { ...data, acrs: newLoading() };
}

export function setClustersLoading(data: ResourceGroupReferenceData): ResourceGroupReferenceData {
    return { ...data, clusters: newLoading() };
}

export function updateAcrNames(data: ResourceGroupReferenceData, acrNames: AcrName[]): ResourceGroupReferenceData {
    const existingAcrs = orDefault(data.acrs, []);
    const newKeys: AcrKey[] = acrNames.map((acrName) => ({ ...data.key, acrName }));
    const updatedAcrs = updateValues(
        existingAcrs,
        newKeys,
        (acr) => acr.key,
        (key) => ({
            key,
            repositories: newNotLoaded(),
        }),
    );

    return {
        ...data,
        acrs: newLoaded(updatedAcrs),
    };
}

export function updateClusterNames(
    data: ResourceGroupReferenceData,
    clusterNames: ClusterName[],
): ResourceGroupReferenceData {
    const existingClusters = orDefault(data.clusters, []);
    const newKeys: ClusterKey[] = clusterNames.map((clusterName) => ({ ...data.key, clusterName }));
    const updatedClusters = updateValues(
        existingClusters,
        newKeys,
        (cluster) => cluster.key,
        (key) => ({
            key,
            connectedAcrs: newNotLoaded(),
        }),
    );

    return {
        ...data,
        clusters: newLoaded(updatedClusters),
    };
}

export function setRepositoriesLoading(data: ResourceGroupReferenceData, acrName: AcrName): ResourceGroupReferenceData {
    return updateAcr(data, acrName, (acr) => AcrDataUpdate.setRepositoriesLoading(acr));
}

export function updateRepositoryNames(
    data: ResourceGroupReferenceData,
    acrName: AcrName,
    repositoryNames: RepositoryName[],
): ResourceGroupReferenceData {
    return updateAcr(data, acrName, (acr) => AcrDataUpdate.updateRepositoryNames(acr, repositoryNames));
}

export function setBuiltTagsLoading(
    data: ResourceGroupReferenceData,
    acrName: AcrName,
    repositoryName: RepositoryName,
): ResourceGroupReferenceData {
    return updateAcr(data, acrName, (acr) => AcrDataUpdate.setBuiltTagsLoading(acr, repositoryName));
}

export function updateBuiltTags(
    data: ResourceGroupReferenceData,
    acrName: AcrName,
    repositoryName: RepositoryName,
    tags: string[],
): ResourceGroupReferenceData {
    return updateAcr(data, acrName, (acr) => AcrDataUpdate.updateBuiltTags(acr, repositoryName, tags));
}

export function setConnectedAcrsLoading(data: ResourceGroupReferenceData, clusterName: ClusterName) {
    return updateCluster(data, clusterName, (c) => ClusterDataUpdate.setConnectedAcrsLoading(c));
}

export function updateConnectedAcrs(
    data: ResourceGroupReferenceData,
    clusterName: ClusterName,
    acrs: AcrKey[],
): ResourceGroupReferenceData {
    return updateCluster(data, clusterName, (c) => ClusterDataUpdate.updateConnectedAcrs(c, acrs));
}

function updateAcr(
    data: ResourceGroupReferenceData,
    acrName: AcrName,
    updater: (data: AcrReferenceData) => AcrReferenceData,
): ResourceGroupReferenceData {
    return {
        ...data,
        acrs: lazyMap(data.acrs, (acrs) => replaceItem(acrs, (acr) => acr.key.acrName === acrName, updater)),
    };
}

function updateCluster(
    data: ResourceGroupReferenceData,
    clusterName: ClusterName,
    updater: (data: ClusterReferenceData) => ClusterReferenceData,
): ResourceGroupReferenceData {
    return {
        ...data,
        clusters: lazyMap(data.clusters, (clusters) =>
            replaceItem(clusters, (c) => c.key.clusterName === clusterName, updater),
        ),
    };
}
