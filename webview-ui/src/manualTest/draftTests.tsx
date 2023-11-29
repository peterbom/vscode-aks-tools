import { useEffect, useState } from "react";
import { MessageHandler, MessageSink } from "../../../src/webview-contract/messaging";
import {
    AcrKey,
    AcrName,
    ClusterKey,
    ClusterName,
    DeploymentSpecType,
    ImageTag,
    InitialState,
    RepositoryKey,
    RepositoryName,
    ResourceGroup,
    ResourceGroupKey,
    Subscription,
    SubscriptionKey,
    ToVsCodeMsgDef,
    ToWebViewMsgDef,
} from "../../../src/webview-contract/webviewDefinitions/draft";
import { Draft } from "../Draft/Draft";
import { stateUpdater } from "../Draft/state";
import { Scenario } from "../utilities/manualTest";
import { aksStoreDemoFiles } from "./draftData/testFileSystems";
import { FilePicker } from "./utilities/filePicker";
import { TestDialogEvents } from "./utilities/testDialogEvents";
import {
    Directory,
    FilePickerOptions,
    FilePickerResult,
} from "../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";
import { fromFindOutput } from "./draftData/testFileSystemUtils";

const appDeploymentSub: Subscription = { id: "f3adef54-889d-49cf-87c8-5fd622071914", name: "App Deployment Sub" };
const prodStoreSub: Subscription = { id: "49dfdd93-df02-46d3-86d2-f77ef1ab2a45", name: "Prod Store Sub" };
const testStoreSub: Subscription = { id: "c186e050-c6b9-43a7-bbd4-4608cac4ce88", name: "Test Store Sub" };
const corpSubs: Subscription[] = [
    { id: "00000000-0000-0000-0000-000000000001", name: "Corp Sub 01" },
    { id: "00000000-0000-0000-0000-000000000002", name: "Corp Sub 02" },
    { id: "00000000-0000-0000-0000-000000000003", name: "Corp Sub 03" },
    { id: "00000000-0000-0000-0000-000000000004", name: "Corp Sub 04" },
    { id: "00000000-0000-0000-0000-000000000005", name: "Corp Sub 05" },
    { id: "00000000-0000-0000-0000-000000000006", name: "Corp Sub 06" },
    { id: "00000000-0000-0000-0000-000000000007", name: "Corp Sub 07" },
    { id: "00000000-0000-0000-0000-000000000008", name: "Corp Sub 08" },
    { id: "00000000-0000-0000-0000-000000000009", name: "Corp Sub 09" },
];

function createSubscriptionData(subscription: Subscription, appNames: string[]): SubscriptionData {
    const appGroups = appNames.flatMap((appName) => [`${appName}-dev-rg`, `${appName}-test-rg`, `${appName}-prod-rg`]);
    const otherGroups = Array.from({ length: 5 }, (_, i) => `other-${String(i + 1).padStart(2, "0")}-rg`);
    return {
        subscription,
        resourceGroups: [...appGroups, ...otherGroups].map((group) =>
            createResourceGroupData(subscription.id, group, appNames),
        ),
    };
}

function createResourceGroupData(
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    appNames: string[],
): ResourceGroupData {
    const groupNameParts = resourceGroup.replace(/-rg$/, "").split("-");
    const env = groupNameParts[groupNameParts.length - 1];

    const appAcrs = appNames.map((appName) => `${alphanumeric(appName)}${env}acr`);
    const otherAcrs = Array.from({ length: 5 }, (_, i) => `${env}acr${String(i + 1).padStart(2, "0")}`);

    const appClusters = appNames.map((appName) => `${appName}-${env}-cluster`);
    const otherClusters = Array.from({ length: 5 }, (_, i) => `${env}-cluster-${String(i + 1).padStart(2, "0")}`);

    const appConnectedAcrs: AcrKey[] = appAcrs.map((acrName) => ({ subscriptionId, resourceGroup, acrName }));

    return {
        name: resourceGroup,
        acrs: [...appAcrs, ...otherAcrs].map((acr) => createAcrData(acr, appNames)),
        clusters: [...appClusters, ...otherClusters].map((cluster) => createClusterData(cluster, appConnectedAcrs)),
    };
}

function createAcrData(name: AcrName, appNames: string[]): AcrData {
    const appRepos = appNames.map((appName) => `${alphanumeric(appName)}app`);
    const otherRepos = Array.from({ length: 5 }, (_, i) => `other/repo${String(i + 1).padStart(2, "0")}`);
    return {
        name,
        repositories: [...appRepos, ...otherRepos].map((repo) => createRepositoryData(repo)),
    };
}

function createRepositoryData(name: RepositoryName): RepositoryData {
    return {
        name,
        builtTags: ["0.0.1", "0.0.2", "0.0.3", "0.1.0", "0.1.1", "0.2.0", "0.3.0", "0.3.1", "latest"],
    };
}

function createClusterData(name: ClusterName, connectedAcrs: AcrKey[]): ClusterData {
    return { name, connectedAcrs };
}

type ScenarioData = {
    name: string;
    initialState: InitialState;
    referenceData: ReferenceData;
    rootDir: Directory;
};

type ReferenceData = {
    subscriptions: SubscriptionData[];
};

type SubscriptionData = {
    subscription: Subscription;
    resourceGroups: ResourceGroupData[];
};

type ResourceGroupData = {
    name: ResourceGroup;
    acrs: AcrData[];
    clusters: ClusterData[];
};

type AcrData = {
    name: AcrName;
    repositories: RepositoryData[];
};

type RepositoryData = {
    name: RepositoryName;
    builtTags: ImageTag[];
};

type ClusterData = {
    name: string;
    connectedAcrs: AcrKey[];
};

const aksStoreDemoServices = [
    "ai-service",
    "makeline-service",
    "order-service",
    "product-service",
    "store-admin",
    "store-front",
    "virtual-customer",
    "virtual-worker",
];
const aksStoreDemoPorts = [5001, 3001, 3000, 3002, 8081, 8080, null, null];

const scenarioDataItems: ScenarioData[] = [
    {
        name: "empty workspace",
        initialState: makeEmptyInitialState("test-workspace"),
        referenceData: {
            subscriptions: corpSubs.map((sub) => createSubscriptionData(sub, [])),
        },
        rootDir: fromFindOutput(aksStoreDemoFiles, "/code/aks-store-demo"),
    },
    {
        name: "single service",
        initialState: build(
            makeEmptyInitialState("test-web-app"),
            withAzureResources(appDeploymentSub, "contoso"),
            withAdditionalServices("contoso"),
            withBuildConfigs(3000),
            withDeploymentSpecs("manifests"),
            withGitHubWorkflows(),
        ),
        referenceData: {
            subscriptions: [appDeploymentSub, ...corpSubs].map((sub) =>
                createSubscriptionData(sub, ["contoso", "other-app"]),
            ),
        },
        rootDir: fromFindOutput(aksStoreDemoFiles, "/code/aks-store-demo"),
    },
    {
        name: "store demo - clean",
        initialState: build(
            makeEmptyInitialState("aks-store-demo"),
            withAdditionalServices(...aksStoreDemoServices),
            withBuildConfigs(...aksStoreDemoPorts),
        ),
        referenceData: {
            subscriptions: [testStoreSub, prodStoreSub, ...corpSubs].map((sub) =>
                createSubscriptionData(sub, ["aks-store-demo", "other-app"]),
            ),
        },
        rootDir: fromFindOutput(aksStoreDemoFiles, "/code/aks-store-demo"),
    },
    {
        name: "store demo - populated",
        initialState: build(
            makeEmptyInitialState("aks-store-demo"),
            withAdditionalServices(...aksStoreDemoServices),
            withBuildConfigs(...aksStoreDemoPorts),
            withAzureResources(prodStoreSub, "aks-store-demo"),
            withDeploymentSpecs("manifests"),
            withGitHubWorkflows(),
        ),
        referenceData: {
            subscriptions: [testStoreSub, prodStoreSub, ...corpSubs].map((sub) =>
                createSubscriptionData(sub, ["aks-store-demo", "other-app"]),
            ),
        },
        rootDir: fromFindOutput(aksStoreDemoFiles, "/code/aks-store-demo"),
    },
];

type StateUpdater = (state: InitialState) => InitialState;

function makeEmptyInitialState(workspaceName: string): InitialState {
    return {
        workspaceName: workspaceName,
        savedAzureResources: null,
        savedServices: [],
    };
}

function withAzureResources(subscription: Subscription, appName: string): StateUpdater {
    return (state) => ({
        ...state,
        savedAzureResources: {
            subscription,
            repositoryDefinition: {
                resourceGroup: `${appName}-prod-rg`,
                acrName: `${alphanumeric(appName)}prodacr`,
                repositoryName: `${alphanumeric(appName)}app`,
            },
            clusterDefinition: {
                resourceGroup: `${appName}-prod-rg`,
                name: `${appName}-prod-cluster`,
            },
        },
    });
}

function withAdditionalServices(...names: string[]): StateUpdater {
    return (state) => ({
        ...state,
        savedServices: [
            ...state.savedServices,
            ...names.map((name) => ({
                name,
                path: name,
                buildConfig: null,
                deploymentSpec: null,
                gitHubWorkflow: null,
            })),
        ],
    });
}

function withBuildConfigs(...ports: (number | null)[]): StateUpdater {
    return (state) => {
        const isSingleService = state.savedServices.length === 1;
        return {
            ...state,
            savedServices: state.savedServices.map((service, i) => ({
                ...service,
                buildConfig: service.buildConfig || {
                    dockerfilePath: isSingleService ? "Dockerfile" : `src/${service.name}/Dockerfile`,
                    dockerContextPath: isSingleService ? "" : `src/${service.name}`,
                    port: ports[i] || null,
                },
            })),
        };
    };
}

function withDeploymentSpecs(type: DeploymentSpecType): StateUpdater {
    return (state) => {
        const isSingleService = state.savedServices.length === 1;
        return {
            ...state,
            savedServices: state.savedServices.map((service) => ({
                ...service,
                deploymentSpec: service.deploymentSpec || {
                    type,
                    path: isSingleService ? "" : `src/${service.name}`,
                },
            })),
        };
    };
}

function withGitHubWorkflows(): StateUpdater {
    return (state) => {
        const isSingleService = state.savedServices.length === 1;
        return {
            ...state,
            savedServices: state.savedServices.map((service) => ({
                ...service,
                gitHubWorkflow: service.gitHubWorkflow || {
                    workflowPath: isSingleService
                        ? getWorkflowFilename(service.deploymentSpec?.type || "manifests")
                        : `aks-deploy-${service.name}.yml`,
                },
            })),
        };
    };
}

function getWorkflowFilename(deploymentSpecType: DeploymentSpecType) {
    return deploymentSpecType === "manifests"
        ? "azure-kubernetes-service.yml"
        : `azure-kubernetes-service-${deploymentSpecType}.yml`;
}

function alphanumeric(value: string): string {
    return value.replace(/[^a-z0-9]/gi, "");
}

function build(state: InitialState, ...updaters: StateUpdater[]): InitialState {
    return updaters.reduce<InitialState>((state, updater) => updater(cloneInitialState(state)), state);
}

function cloneInitialState(state: InitialState): InitialState {
    // Inefficient but acceptable for testing purposes.
    return JSON.parse(JSON.stringify(state));
}

export function getDraftScenarios() {
    function getMessageHandler(
        webview: MessageSink<ToWebViewMsgDef>,
        scenarioData: ScenarioData,
        dialogEvents: TestDialogEvents,
    ): MessageHandler<ToVsCodeMsgDef> {
        return {
            createNewService: () => undefined,
            getSubscriptionsRequest: handleGetSubscriptionsRequest,
            getResourceGroupsRequest: handleGetResourceGroupsRequest,
            getAcrNamesRequest: handleGetAcrNamesRequest,
            getRepositoriesRequest: handleGetRepositoriesRequest,
            getBuiltTagsRequest: handleGetBuildTagsRequest,
            getClustersRequest: handleGetClustersRequest,
            getConnectedAcrsRequest: handleGetAcrsRequest,
            pickFileRequest: handlePickFileRequest,
        };

        async function handleGetSubscriptionsRequest() {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            webview.postGetSubscriptionsResponse(scenarioData.referenceData.subscriptions.map((s) => s.subscription));
        }

        async function handleGetResourceGroupsRequest(key: SubscriptionKey) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const subscriptionData = getSubscriptionData(scenarioData.referenceData, key);
            webview.postGetResourceGroupsResponse({
                ...key,
                groups: subscriptionData.resourceGroups.map((g) => g.name),
            });
        }

        async function handleGetAcrNamesRequest(key: ResourceGroupKey) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const resourceGroupData = getResourceGroupData(scenarioData.referenceData, key);
            webview.postGetAcrNamesResponse({
                ...key,
                acrNames: resourceGroupData.acrs.map((acr) => acr.name),
            });
        }

        async function handleGetRepositoriesRequest(key: AcrKey) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const acrData = getAcrData(scenarioData.referenceData, key);
            webview.postGetRepositoriesResponse({
                ...key,
                repositoryNames: acrData.repositories.map((r) => r.name),
            });
        }

        async function handleGetBuildTagsRequest(key: RepositoryKey) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const repoData = getRepositoryData(scenarioData.referenceData, key);
            webview.postGetBuiltTagsResponse({
                ...key,
                tags: repoData.builtTags,
            });
        }

        async function handleGetClustersRequest(key: ResourceGroupKey) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const resourceGroupData = getResourceGroupData(scenarioData.referenceData, key);
            webview.postGetClustersResponse({
                ...key,
                clusterNames: resourceGroupData.clusters.map((c) => c.name),
            });
        }

        async function handleGetAcrsRequest(key: ClusterKey) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const clusterData = getClusterData(scenarioData.referenceData, key);
            webview.postGetConnectedAcrsResponse({
                ...key,
                acrs: clusterData.connectedAcrs,
            });
        }

        async function handlePickFileRequest(options: FilePickerOptions) {
            const result = await dialogEvents.pickFile(options);
            webview.postPickFileResponse(result);
        }
    }

    return scenarioDataItems.map((data) => {
        const dialogEvents = new TestDialogEvents();
        return Scenario.create(
            "draft",
            data.name,
            () => <DraftWithDialogs initialState={data.initialState} events={dialogEvents} rootDir={data.rootDir} />,
            (webview) => getMessageHandler(webview, data, dialogEvents),
            stateUpdater.vscodeMessageHandler,
        );
    });
}

function getSubscriptionData(referenceData: ReferenceData, key: SubscriptionKey): SubscriptionData {
    const subscriptionData = referenceData.subscriptions.find((s) => s.subscription.id === key.subscriptionId);
    if (!subscriptionData) throw new Error(`Subscription ${key.subscriptionId} not found in reference data`);
    return subscriptionData;
}

function getResourceGroupData(referenceData: ReferenceData, key: ResourceGroupKey): ResourceGroupData {
    const subscriptionData = getSubscriptionData(referenceData, key);
    const resourceGroupData = subscriptionData.resourceGroups.find((g) => g.name === key.resourceGroup);
    if (!resourceGroupData) throw new Error(`Resource group ${key.resourceGroup} not found in ${key.subscriptionId}`);
    return resourceGroupData;
}

function getAcrData(referenceData: ReferenceData, key: AcrKey): AcrData {
    const resourceGroupData = getResourceGroupData(referenceData, key);
    const acrData = resourceGroupData.acrs.find((acr) => acr.name === key.acrName);
    if (!acrData) {
        throw new Error(
            `ACR ${key.acrName} not found in resource group ${key.resourceGroup} in subscription ${key.subscriptionId}`,
        );
    }
    return acrData;
}

function getRepositoryData(referenceData: ReferenceData, key: RepositoryKey): RepositoryData {
    const acrData = getAcrData(referenceData, key);
    const repoData = acrData.repositories.find((r) => r.name === key.repositoryName);
    if (!repoData) {
        throw new Error(
            `Repository ${key.repositoryName} not found in ACR ${key.acrName} in resource group ${key.resourceGroup} in subscription ${key.subscriptionId}`,
        );
    }
    return repoData;
}

function getClusterData(referenceData: ReferenceData, key: ClusterKey): ClusterData {
    const resourceGroupData = getResourceGroupData(referenceData, key);
    const clusterData = resourceGroupData.clusters.find((c) => c.name === key.clusterName);
    if (!clusterData) {
        throw new Error(
            `Cluster ${key.clusterName} not found in resource group ${key.resourceGroup} in subscription ${key.subscriptionId}`,
        );
    }
    return clusterData;
}

type DraftWithDialogsProps = {
    initialState: InitialState;
    events: TestDialogEvents;
    rootDir: Directory;
};

function DraftWithDialogs(props: DraftWithDialogsProps) {
    const [filePickerShown, setFilePickerShown] = useState(false);
    const [filePickerOptions, setFilePickerOptions] = useState<FilePickerOptions>({
        type: "file",
        mustExist: false,
    });

    useEffect(() => {
        props.events.onPickFileRequest((options) => {
            setFilePickerOptions(options);
            setFilePickerShown(true);
        });
    }, [props.events]);

    function handleFilePickerClose(result: FilePickerResult | null) {
        setFilePickerShown(false);
        props.events.notifyFilePickerResult(result);
    }

    return (
        <>
            <Draft {...props.initialState} />
            {filePickerShown && (
                <FilePicker
                    shown={filePickerShown}
                    options={filePickerOptions}
                    closeRequested={handleFilePickerClose}
                    rootDir={props.rootDir}
                />
            )}
        </>
    );
}
