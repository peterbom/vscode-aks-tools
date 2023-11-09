import { MessageHandler, MessageSink } from "../../../src/webview-contract/messaging";
import { DeploymentSpecType, InitialState, ServiceState, ToVsCodeMsgDef, ToWebViewMsgDef } from "../../../src/webview-contract/webviewDefinitions/draft";
import { Draft } from "../Draft/Draft";
import { stateUpdater } from "../Draft/state";
import { Scenario } from "../utilities/manualTest";

const emptyInitialState = makeEmptyInitialState("test-workspace");

const singleServiceInitialState = build(
    makeEmptyInitialState("test-web-app"),
    withAzureResources("f3adef54-889d-49cf-87c8-5fd622071914", "contoso"),
    withAdditionalServices("contoso"),
    withBuildConfigs(3000),
    withDeploymentSpecs("manifests"),
    withGitHubWorkflows()
);

const storeDemoCleanInitialState = build(
    makeEmptyInitialState("aks-store-demo"),
    withAdditionalServices("ai-service", "makeline-service", "order-service", "product-service", "store-admin", "store-front", "virtual-customer", "virtual-worker"),
    withBuildConfigs(5001, 3001, 3000, 3002, 8081, 8080, null, null)
);

const storeDemoPopulatedInitialState = build(
    storeDemoCleanInitialState,
    withAzureResources("49dfdd93-df02-46d3-86d2-f77ef1ab2a45", "aks-store-demo"),
    withDeploymentSpecs("manifests"),
    withGitHubWorkflows()
);

type StateUpdater = (state: InitialState) => InitialState;

function makeEmptyInitialState(workspaceName: string): InitialState {
    return {
        workspaceName: workspaceName,
        azureResources: null,
        services: []
    };
}

function withAzureResources(subscriptionId: string, appName: string): StateUpdater {
    return (state) => ({
        ...state,
        azureResources: {
            subscriptionId,
            repositoryDefinition: {
                resourceGroup: `${appName}-prod-rg`,
                acrName: `${alphanumeric(appName)}prodacr`,
                repositoryName: `${alphanumeric(appName)}app`,
                builtTags: ["0.0.1", "latest"]
            },
            clusterDefinition: {
                resourceGroup: `${appName}-prod-rg`,
                name: `${appName}-prod-cluster`
            }
        }
    });
}

function withAdditionalServices(...appNames: string[]): StateUpdater {
    return (state) => ({
        ...state,
        services: [...state.services, ...appNames.map(appName => ({
            appName,
            buildConfig: null,
            deploymentSpec: null,
            gitHubWorkflow: null
        }))]
    });
}

function withBuildConfigs(...ports: (number | null)[]): StateUpdater {
    return (state) => {
        const isSingleService = state.services.length === 1;
        return {
            ...state,
            services: state.services.map((service, i) => ({
                ...service,
                buildConfig: service.buildConfig || {
                    dockerfilePath: isSingleService ? "Dockerfile" : `src/${service.appName}/Dockerfile`,
                    dockerContextPath: isSingleService ? "" : `src/${service.appName}`,
                    port: ports[i] || null
                }
            }))
        };
    };
}

function withDeploymentSpecs(type: DeploymentSpecType): StateUpdater {
    return (state) => {
        const isSingleService = state.services.length === 1;
        return {
            ...state,
            services: state.services.map(service => ({
                ...service,
                deploymentSpec: service.deploymentSpec || {
                    type,
                    path: isSingleService ? "" : `src/${service.appName}`
                }
            }))
        };
    };
}

function withGitHubWorkflows(): StateUpdater {
    return (state) => {
        const isSingleService = state.services.length === 1;
        return {
            ...state,
            services: state.services.map(service => ({
                ...service,
                gitHubWorkflow: service.gitHubWorkflow || {
                    workflowPath: isSingleService ? getWorkflowFilename(service.deploymentSpec?.type || "manifests") : `aks-deploy-${service.appName}.yml`
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
    function getMessageHandler(webview: MessageSink<ToWebViewMsgDef>): MessageHandler<ToVsCodeMsgDef> {
        return {};
    }

    return [
        Scenario.create("draft", "empty workspace", () => <Draft {...emptyInitialState} />, getMessageHandler, stateUpdater.vscodeMessageHandler),
        Scenario.create("draft", "single service", () => <Draft {...singleServiceInitialState} />, getMessageHandler, stateUpdater.vscodeMessageHandler),
        Scenario.create("draft", "store demo - clean", () => <Draft {...storeDemoCleanInitialState} />, getMessageHandler, stateUpdater.vscodeMessageHandler),
        Scenario.create("draft", "store demo - populated", () => <Draft {...storeDemoPopulatedInitialState} />, getMessageHandler, stateUpdater.vscodeMessageHandler)
    ];
}