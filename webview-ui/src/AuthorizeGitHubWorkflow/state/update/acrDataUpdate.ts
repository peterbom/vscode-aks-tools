import { AcrRoleDefinition } from "../../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { newLoaded, newLoading } from "../../../utilities/lazy";
import { AcrReferenceData } from "../stateTypes";

export function setRoleAssignmentsLoading(data: AcrReferenceData, servicePrincipalId: string): AcrReferenceData {
    return {
        ...data,
        assignedRoleDefinitions: {
            ...data.assignedRoleDefinitions,
            [servicePrincipalId]: newLoading(),
        },
    };
}

export function updateRoleAssignments(
    data: AcrReferenceData,
    servicePrincipalId: string,
    assignedRoleDefinitions: AcrRoleDefinition[],
): AcrReferenceData {
    return {
        ...data,
        assignedRoleDefinitions: {
            ...data.assignedRoleDefinitions,
            [servicePrincipalId]: newLoaded(assignedRoleDefinitions),
        },
    };
}
