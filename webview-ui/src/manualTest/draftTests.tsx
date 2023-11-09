import { MessageHandler, MessageSink } from "../../../src/webview-contract/messaging";
import { DeploymentSpecType, InitialState, Subscription, ToVsCodeMsgDef, ToWebViewMsgDef } from "../../../src/webview-contract/webviewDefinitions/draft";
import { Draft } from "../Draft/Draft";
import { stateUpdater } from "../Draft/state";
import { distinct } from "../utilities/array";
import { Scenario } from "../utilities/manualTest";

const appDeploymentSub: Subscription = {id: "f3adef54-889d-49cf-87c8-5fd622071914", name: "App Deployment Sub"};
const prodStoreSub: Subscription = {id: "49dfdd93-df02-46d3-86d2-f77ef1ab2a45", name: "Prod Store Sub"};
const testStoreSub: Subscription = {id: "c186e050-c6b9-43a7-bbd4-4608cac4ce88", name: "Test Store Sub"};
const corpSubs: Subscription[] = [
    {id: "00000000-0000-0000-0000-000000000001", name: "Corp Sub 01"},
    {id: "00000000-0000-0000-0000-000000000002", name: "Corp Sub 02"},
    {id: "00000000-0000-0000-0000-000000000003", name: "Corp Sub 03"},
    {id: "00000000-0000-0000-0000-000000000004", name: "Corp Sub 04"},
    {id: "00000000-0000-0000-0000-000000000005", name: "Corp Sub 05"},
    {id: "00000000-0000-0000-0000-000000000006", name: "Corp Sub 06"},
    {id: "00000000-0000-0000-0000-000000000007", name: "Corp Sub 07"},
    {id: "00000000-0000-0000-0000-000000000008", name: "Corp Sub 08"},
    {id: "00000000-0000-0000-0000-000000000009", name: "Corp Sub 09"}
];

type ScenarioData = {
    name: string;
    initialState: InitialState;
    availableSubscriptions: Subscription[];
};

const scenarioDataItems: ScenarioData[] = [
    {
        name: "empty workspace",
        initialState: makeEmptyInitialState("test-workspace"),
        availableSubscriptions: corpSubs
    },
    {
        name: "single service",
        initialState: build(
            makeEmptyInitialState("test-web-app"),
            withAzureResources(appDeploymentSub, "contoso"),
            withAdditionalServices("contoso"),
            withBuildConfigs(3000),
            withDeploymentSpecs("manifests"),
            withGitHubWorkflows()),
        availableSubscriptions: [appDeploymentSub, ...corpSubs]
    },
    {
        name: "store demo - clean",
        initialState: build(
            makeEmptyInitialState("aks-store-demo"),
            withAdditionalServices("ai-service", "makeline-service", "order-service", "product-service", "store-admin", "store-front", "virtual-customer", "virtual-worker"),
            withBuildConfigs(5001, 3001, 3000, 3002, 8081, 8080, null, null)),
        availableSubscriptions: [testStoreSub, prodStoreSub, ...corpSubs]
    },
    {
        name: "store demo - populated",
        initialState: build(
            makeEmptyInitialState("aks-store-demo"),
            withAdditionalServices("ai-service", "makeline-service", "order-service", "product-service", "store-admin", "store-front", "virtual-customer", "virtual-worker"),
            withAzureResources(prodStoreSub, "aks-store-demo"),
            withDeploymentSpecs("manifests"),
            withGitHubWorkflows()),
        availableSubscriptions: [testStoreSub, prodStoreSub, ...corpSubs]
    }
];

type StateUpdater = (state: InitialState) => InitialState;

function makeEmptyInitialState(workspaceName: string): InitialState {
    return {
        workspaceName: workspaceName,
        savedAzureResources: null,
        savedServices: []
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
                repositoryName: `${alphanumeric(appName)}app`
            },
            clusterDefinition: {
                resourceGroup: `${appName}-prod-rg`,
                name: `${appName}-prod-cluster`
            }
        }
    });
}

function withAdditionalServices(...names: string[]): StateUpdater {
    return (state) => ({
        ...state,
        savedServices: [...state.savedServices, ...names.map(name => ({
            name,
            buildConfig: null,
            deploymentSpec: null,
            gitHubWorkflow: null
        }))]
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
                    port: ports[i] || null
                }
            }))
        };
    };
}

function withDeploymentSpecs(type: DeploymentSpecType): StateUpdater {
    return (state) => {
        const isSingleService = state.savedServices.length === 1;
        return {
            ...state,
            savedServices: state.savedServices.map(service => ({
                ...service,
                deploymentSpec: service.deploymentSpec || {
                    type,
                    path: isSingleService ? "" : `src/${service.name}`
                }
            }))
        };
    };
}

function withGitHubWorkflows(): StateUpdater {
    return (state) => {
        const isSingleService = state.savedServices.length === 1;
        return {
            ...state,
            savedServices: state.savedServices.map(service => ({
                ...service,
                gitHubWorkflow: service.gitHubWorkflow || {
                    workflowPath: isSingleService ? getWorkflowFilename(service.deploymentSpec?.type || "manifests") : `aks-deploy-${service.name}.yml`
                }
            }))
        }
    }
}

function getWorkflowFilename(deploymentSpecType: DeploymentSpecType) {
    return deploymentSpecType === "manifests" ? "azure-kubernetes-service.yml" : `azure-kubernetes-service-${deploymentSpecType}.yml`;
}

function alphanumeric(value: string): string {
    return value.replace(/[^a-z0-9]/gi, '');
}

function build(state: InitialState, ...updaters: StateUpdater[]): InitialState {
    return updaters.reduce<InitialState>((state, updater) => updater(cloneInitialState(state)), state);
}

function cloneInitialState(state: InitialState): InitialState {
    // Inefficient but acceptable for testing purposes.
    return JSON.parse(JSON.stringify(state));
}

export function getDraftScenarios() {
    function getMessageHandler(webview: MessageSink<ToWebViewMsgDef>, scenarioData: ScenarioData): MessageHandler<ToVsCodeMsgDef> {
        return {
            createNewService: () => undefined,
            getSubscriptionsRequest: handleGetSubscriptionsRequest,
            getResourceGroupsRequest: handleGetResourceGroupsRequest,
            getBuiltTagsRequest: args => handleGetBuildTagsRequest(args.subscriptionId, args.acrName, args.repositoryName)
        };

        async function handleGetSubscriptionsRequest() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            webview.postGetSubscriptionsResponse(scenarioData.availableSubscriptions);
        }

        async function handleGetResourceGroupsRequest(subId: string) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const subscription = scenarioData.availableSubscriptions.find(s => s.id === subId);
            const groupBaseName = alphanumeric(subscription!.name);
            const knownResourceGroups = [
                scenarioData.initialState.savedAzureResources?.clusterDefinition?.resourceGroup,
                scenarioData.initialState.savedAzureResources?.repositoryDefinition?.resourceGroup
            ].filter(g => !!g) as string[];
            const generatedResourceGroups = Array.from({length: 10}, (_, i) => `${groupBaseName}-${String(i + 1).padStart(2, '0')}`);
            webview.postGetResourceGroupsResponse({
                subscriptionId: subId,
                groups: distinct([...knownResourceGroups, ...generatedResourceGroups])
            })
        }

        async function handleGetBuildTagsRequest(subscriptionId: string, acrName: string, repositoryName: string) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            webview.postGetBuiltTagsResponse({
                subscriptionId,
                acrName,
                repositoryName,
                tags: ["0.0.1", "latest"]
            });
        }
    }

    return scenarioDataItems.map(data => Scenario.create(
        "draft",
        data.name,
        () => <Draft {...data.initialState} />,
        webview => getMessageHandler(webview, data),
        stateUpdater.vscodeMessageHandler));
}