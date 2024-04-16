import {
    AcrKey,
    AcrRoleDefinition,
    ClusterKey,
    ClusterRoleDefinition,
} from "../../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { replaceItem, updateValues } from "../../../utilities/array";
import { map as lazyMap, newLoaded, orDefault } from "../../../utilities/lazy";
import { AcrReferenceData, ClusterReferenceData, SubscriptionReferenceData } from "../stateTypes";
import * as AcrDataUpdate from "./acrDataUpdate";
import * as ClusterDataUpdate from "./clusterDataUpdate";

export function updateAcrs(data: SubscriptionReferenceData, newKeys: AcrKey[]): SubscriptionReferenceData {
    const existingAcrs = orDefault(data.acrs, []);
    const updatedAcrs = updateValues(
        existingAcrs,
        newKeys,
        (acr, acrData) => acr.resourceGroup === acrData.acr.resourceGroup && acr.acrName === acrData.acr.acrName,
        (acr) => ({
            acr,
            assignedRoleDefinitions: {},
        }),
    );

    return {
        ...data,
        acrs: newLoaded(updatedAcrs),
    };
}

export function updateClusters(data: SubscriptionReferenceData, newKeys: ClusterKey[]): SubscriptionReferenceData {
    const existingClusters = orDefault(data.clusters, []);
    const updatedClusters = updateValues(
        existingClusters,
        newKeys,
        (cluster, clusterData) =>
            cluster.resourceGroup === clusterData.cluster.resourceGroup &&
            cluster.clusterName === clusterData.cluster.clusterName,
        (cluster) => ({
            cluster,
            assignedRoleDefinitions: {},
        }),
    );

    return {
        ...data,
        clusters: newLoaded(updatedClusters),
    };
}

export function setAcrRoleAssignmentsLoading(
    data: SubscriptionReferenceData,
    acrKey: AcrKey,
    servicePrincipalId: string,
): SubscriptionReferenceData {
    return updateAcr(data, acrKey, (acr) => AcrDataUpdate.setRoleAssignmentsLoading(acr, servicePrincipalId));
}

export function setClusterRoleAssignmentsLoading(
    data: SubscriptionReferenceData,
    clusterKey: ClusterKey,
    servicePrincipalId: string,
): SubscriptionReferenceData {
    return updateCluster(data, clusterKey, (cluster) =>
        ClusterDataUpdate.setRoleAssignmentsLoading(cluster, servicePrincipalId),
    );
}

export function updateAcrRoleAssignments(
    data: SubscriptionReferenceData,
    acrKey: AcrKey,
    servicePrincipalId: string,
    assignedRoleDefinitions: AcrRoleDefinition[],
): SubscriptionReferenceData {
    return updateAcr(data, acrKey, (acr) =>
        AcrDataUpdate.updateRoleAssignments(acr, servicePrincipalId, assignedRoleDefinitions),
    );
}

export function updateClusterRoleAssignments(
    data: SubscriptionReferenceData,
    clusterKey: ClusterKey,
    servicePrincipalId: string,
    assignedRoleDefinitions: ClusterRoleDefinition[],
): SubscriptionReferenceData {
    return updateCluster(data, clusterKey, (cluster) =>
        ClusterDataUpdate.updateRoleAssignments(cluster, servicePrincipalId, assignedRoleDefinitions),
    );
}

function updateAcr(
    data: SubscriptionReferenceData,
    acrKey: AcrKey,
    updater: (data: AcrReferenceData) => AcrReferenceData,
): SubscriptionReferenceData {
    return {
        ...data,
        acrs: lazyMap(data.acrs, (acrs) =>
            replaceItem(
                acrs,
                (acrData) =>
                    acrData.acr.resourceGroup === acrKey.resourceGroup && acrData.acr.acrName === acrKey.acrName,
                updater,
            ),
        ),
    };
}

function updateCluster(
    data: SubscriptionReferenceData,
    clusterKey: ClusterKey,
    updater: (data: ClusterReferenceData) => ClusterReferenceData,
): SubscriptionReferenceData {
    return {
        ...data,
        clusters: lazyMap(data.clusters, (clusters) =>
            replaceItem(
                clusters,
                (clusterData) =>
                    clusterData.cluster.resourceGroup === clusterKey.resourceGroup &&
                    clusterData.cluster.clusterName === clusterKey.clusterName,
                updater,
            ),
        ),
    };
}
