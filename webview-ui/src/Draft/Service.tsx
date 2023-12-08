import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef, ServiceState, vscode } from "./state";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { PickFileSituation, WorkspaceConfig } from "../../../src/webview-contract/webviewDefinitions/draft";

export interface ServiceProps {
    workspaceConfig: WorkspaceConfig;
    azureResourceState: AzureResourcesState;
    serviceState: ServiceState;
    eventHandlers: EventHandlers<EventDef>;
}

export function Service(props: ServiceProps) {
    const separator = props.workspaceConfig.pathSeparator;
    return (
        <>
            <h3>Service: {props.serviceState.name}</h3>
            <div className={styles.inputContainer}>
                <label className={styles.label}>Build Configuration</label>
                {(props.serviceState.buildConfig !== null && (
                    <dl className={styles.propertyList}>
                        <dt>Dockerfile path</dt>
                        <dd>./{props.serviceState.buildConfig.dockerfilePath}</dd>

                        <dt>Docker context path</dt>
                        <dd>./{props.serviceState.buildConfig.dockerContextPath}</dd>

                        <dt>Port</dt>
                        <dd>{props.serviceState.buildConfig.port}</dd>
                    </dl>
                )) || <span className={styles.midControl}>Not configured</span>}
                <VSCodeButton
                    appearance="secondary"
                    onClick={() => {
                        vscode.postPickFileRequest({
                            situation: PickFileSituation.DockerfilePath,
                            options: {
                                defaultPath: `${props.workspaceConfig.fullPath}${separator}${props.serviceState.relativePath}${separator}Dockerfile`,
                                filters: { Dockerfiles: ["Dockerfile", "Dockerfile.*"] },
                                buttonLabel: "Select",
                                title: `Dockerfile location for ${props.serviceState.name}`,
                            },
                        });
                    }}
                    className={styles.sideControl}
                >
                    {props.serviceState.buildConfig !== null ? "Change" : "Configure"}
                </VSCodeButton>

                <label className={styles.label}>Deployment Spec</label>
                {(props.serviceState.deploymentSpec !== null && (
                    <dl className={styles.propertyList}>
                        <dt>Type</dt>
                        <dd>{props.serviceState.deploymentSpec.type}</dd>

                        <dt>Path</dt>
                        <dd>./{props.serviceState.deploymentSpec.path}</dd>
                    </dl>
                )) || <span className={styles.midControl}>Not configured</span>}
                <VSCodeButton
                    appearance="secondary"
                    onClick={() => {
                        /*TODO*/
                    }}
                    className={styles.sideControl}
                >
                    {props.serviceState.deploymentSpec !== null ? "Change" : "Configure"}
                </VSCodeButton>

                <label className={styles.label}>GitHub Workflow</label>
                {(props.serviceState.gitHubWorkflow !== null && (
                    <dl className={styles.propertyList}>
                        <dt>Path</dt>
                        <dd>./{props.serviceState.gitHubWorkflow.workflowPath}</dd>
                    </dl>
                )) || <span className={styles.midControl}>Not configured</span>}
                <VSCodeButton
                    appearance="secondary"
                    onClick={() => {
                        /*TODO*/
                    }}
                    className={styles.sideControl}
                >
                    {props.serviceState.gitHubWorkflow !== null ? "Change" : "Configure"}
                </VSCodeButton>
            </div>
        </>
    );
}
