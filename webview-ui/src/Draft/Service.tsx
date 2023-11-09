import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef, ServicesState } from "./state";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

export interface ServiceProps {
    azureResourceState: AzureResourcesState;
    serviceState: ServicesState;
    eventHandlers: EventHandlers<EventDef>;
}

export function Service(props: ServiceProps) {
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
                        /*TODO*/
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
