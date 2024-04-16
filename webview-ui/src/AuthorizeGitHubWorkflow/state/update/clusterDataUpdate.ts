import { ClusterRoleDefinition } from "../../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { newLoaded, newLoading } from "../../../utilities/lazy";
import { ClusterReferenceData } from "../stateTypes";

export function setRoleAssignmentsLoading(
    data: ClusterReferenceData,
    servicePrincipalId: string,
): ClusterReferenceData {
    return {
        ...data,
        assignedRoleDefinitions: {
            ...data.assignedRoleDefinitions,
            [servicePrincipalId]: newLoading(),
        },
    };
}

export function updateRoleAssignments(
    data: ClusterReferenceData,
    servicePrincipalId: string,
    assignedRoleDefinitions: ClusterRoleDefinition[],
): ClusterReferenceData {
    return {
        ...data,
        assignedRoleDefinitions: {
            ...data.assignedRoleDefinitions,
            [servicePrincipalId]: newLoaded(assignedRoleDefinitions),
        },
    };
}
