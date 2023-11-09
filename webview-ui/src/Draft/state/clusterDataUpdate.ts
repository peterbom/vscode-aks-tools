import { AcrKey } from "../../../../src/webview-contract/webviewDefinitions/draft";
import { newLoaded, newLoading } from "../../utilities/lazy";
import { ClusterReferenceData } from "../state";

export function setConnectedAcrsLoading(data: ClusterReferenceData): ClusterReferenceData {
    return {
        ...data,
        connectedAcrs: newLoading(),
    };
}

export function updateConnectedAcrs(data: ClusterReferenceData, acrs: AcrKey[]): ClusterReferenceData {
    return {
        ...data,
        connectedAcrs: newLoaded(acrs),
    };
}
