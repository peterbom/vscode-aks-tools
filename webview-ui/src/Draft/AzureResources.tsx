import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import {
    AzureResourcesState,
    ClusterReferenceData,
    EventDef,
    RepositoryReferenceData,
    SubscriptionReferenceData,
} from "./state";
import { VSCodeButton, VSCodeDivider, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { RepositoryDialog } from "./RepositoryDialog";
import { Lazy, isLoaded, isLoading, orDefault } from "../utilities/lazy";
import { Maybe, hasValue, nothing } from "../utilities/maybe";
import { ClusterDialog } from "./ClusterDialog";
import { SubscriptionDialog } from "./SubscriptionDialog";
import { tryGetByKey } from "../utilities/array";
import { AcrKey } from "../../../src/webview-contract/webviewDefinitions/draft";
import { ClusterIcon } from "../icons/clusterIcon";
import { AcrIcon } from "../icons/acrIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faLinkSlash } from "@fortawesome/free-solid-svg-icons";
import { SubscriptionIcon } from "../icons/subscriptionIcon";
import { AllDialogsState } from "./state/dialogs";

export interface AzureResourcesProps {
    resourcesState: AzureResourcesState;
    subscriptionsData: Lazy<SubscriptionReferenceData[]>;
    subscriptionData: Lazy<Maybe<SubscriptionReferenceData>>;
    repositoryData: Lazy<Maybe<RepositoryReferenceData>>;
    clusterData: Lazy<Maybe<ClusterReferenceData>>;
    allDialogsState: AllDialogsState;
    eventHandlers: EventHandlers<EventDef>;
}

export function AzureResources(props: AzureResourcesProps) {
    const subData: Maybe<SubscriptionReferenceData> = orDefault(props.subscriptionData, nothing());
    const clusterData: Maybe<ClusterReferenceData> = orDefault(props.clusterData, nothing());
    const repoData: Maybe<RepositoryReferenceData> = orDefault(props.repositoryData, nothing());
    const isConnected =
        hasValue(clusterData) &&
        hasValue(repoData) &&
        isLoaded(clusterData.value.connectedAcrs) &&
        isLinked(clusterData.value.connectedAcrs.value, repoData.value.key);

    return (
        <>
            <div className={styles.inputContainer}>
                <label htmlFor="subscription" className={styles.label}>
                    <SubscriptionIcon style={{ height: "1rem" }} />
                    &nbsp; Subscription
                </label>
                <span id="subscription">
                    {props.resourcesState.selectedSubscription !== null
                        ? props.resourcesState.selectedSubscription.name
                        : "Not configured"}
                </span>

                <VSCodeButton
                    appearance="secondary"
                    onClick={() => {
                        props.eventHandlers.onSetDialogContent({
                            dialog: "subscription",
                            content: { subscription: props.resourcesState.selectedSubscription || undefined },
                        });
                        props.eventHandlers.onSetDialogVisibility({ dialog: "subscription", shown: true });
                    }}
                    className={styles.sideControl}
                >
                    {props.resourcesState.selectedSubscription !== null ? "Change" : "Configure"}
                </VSCodeButton>

                <VSCodeDivider className={styles.inputContainerDivider} />

                <div className={`${styles.fullWidth} ${styles.linkableContainer}`}>
                    <div className={styles.linkableChild}>
                        <label htmlFor="cluster">
                            <ClusterIcon style={{ height: "1rem" }} />
                            &nbsp; Cluster
                        </label>
                        {isLoading(props.clusterData) && <VSCodeProgressRing style={{ height: "1rem" }} />}
                        {isLoaded(props.clusterData) && (
                            <>
                                <span id="cluster">
                                    {hasValue(clusterData) ? clusterData.value.key.clusterName : "Not configured"}
                                </span>

                                {isLoaded(props.subscriptionData) && hasValue(props.subscriptionData.value) && (
                                    <VSCodeButton
                                        appearance="secondary"
                                        onClick={() => {
                                            props.eventHandlers.onSetDialogContent({
                                                dialog: "cluster",
                                                content: props.resourcesState.clusterDefinition || {},
                                            });
                                            props.eventHandlers.onSetDialogVisibility({
                                                dialog: "cluster",
                                                shown: true,
                                            });
                                        }}
                                    >
                                        {hasValue(props.clusterData.value) ? "Change" : "Configure"}
                                    </VSCodeButton>
                                )}
                            </>
                        )}
                    </div>

                    <div className={styles.linkableChild}>
                        {hasValue(clusterData) && hasValue(repoData) && isLoading(clusterData.value.connectedAcrs) && (
                            <VSCodeProgressRing style={{ height: "1rem" }} />
                        )}
                        {hasValue(clusterData) && hasValue(repoData) && isLoaded(clusterData.value.connectedAcrs) && (
                            <>
                                <span>
                                    <FontAwesomeIcon
                                        className={isConnected ? styles.successIndicator : styles.errorIndicator}
                                        icon={isConnected ? faLink : faLinkSlash}
                                    />
                                </span>

                                <VSCodeButton
                                    appearance="secondary"
                                    onClick={() => {
                                        /* TODO */
                                    }}
                                >
                                    {isConnected ? "Disconnect" : "Connect"}
                                </VSCodeButton>
                            </>
                        )}
                    </div>

                    <div className={styles.linkableChild}>
                        <label htmlFor="repository">
                            <AcrIcon style={{ height: "1rem" }} />
                            &nbsp; Repository
                        </label>
                        {isLoading(props.repositoryData) && <VSCodeProgressRing style={{ height: "1rem" }} />}
                        {isLoaded(props.repositoryData) && (
                            <>
                                <span id="repository">
                                    {hasValue(repoData) ? getFullRepositoryName(repoData.value) : "Not configured"}
                                </span>

                                {isLoaded(props.subscriptionData) && hasValue(props.subscriptionData.value) && (
                                    <VSCodeButton
                                        appearance="secondary"
                                        onClick={() => {
                                            props.eventHandlers.onSetDialogContent({
                                                dialog: "repository",
                                                content: props.resourcesState.repositoryDefinition || {},
                                            });
                                            props.eventHandlers.onSetDialogVisibility({
                                                dialog: "repository",
                                                shown: true,
                                            });
                                        }}
                                    >
                                        {hasValue(props.repositoryData.value) ? "Change" : "Configure"}
                                    </VSCodeButton>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isLoaded(props.subscriptionData) && (
                <SubscriptionDialog
                    state={props.allDialogsState.subscriptionState}
                    subscriptionsData={props.subscriptionsData}
                    eventHandlers={props.eventHandlers}
                />
            )}

            {hasValue(subData) && (
                <>
                    {isLoaded(props.repositoryData) && (
                        <RepositoryDialog
                            state={props.allDialogsState.repositoryState}
                            subscriptionData={subData.value}
                            eventHandlers={props.eventHandlers}
                        />
                    )}
                    {isLoaded(props.clusterData) && (
                        <ClusterDialog
                            state={props.allDialogsState.clusterState}
                            subscriptionData={subData.value}
                            eventHandlers={props.eventHandlers}
                        />
                    )}
                </>
            )}
        </>
    );
}

function getFullRepositoryName(repoData: RepositoryReferenceData): string {
    return `${repoData.key.acrName}.azurecr.io/${repoData.key.repositoryName}`;
}

function isLinked(connectedAcrs: AcrKey[], repoAcr: AcrKey): boolean {
    const { subscriptionId, resourceGroup, acrName } = repoAcr;
    const acrKey = { subscriptionId, resourceGroup, acrName };
    const matchingAcr = tryGetByKey(connectedAcrs, acrKey, (key) => key);
    return hasValue(matchingAcr);
}
