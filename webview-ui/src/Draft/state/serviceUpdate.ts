import { SaveFileResult } from "../../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";
import { ServiceState } from "../state";

export function updateDockerfilePath(state: ServiceState, result: SaveFileResult): ServiceState {
    if (!state.buildConfig) return state;
    return { ...state, buildConfig: { ...state.buildConfig, dockerfilePath: result.path } };
}
