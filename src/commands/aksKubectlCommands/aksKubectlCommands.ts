import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { getKubernetesClusterInfo } from '../utils/clusters';
import { getExtension } from '../utils/host';
import { failed } from '../utils/errorable';
import * as tmpfile from '../utils/tempfile';
import { KubectlDataProvider, KubectlPanel } from '../../panels/KubectlPanel';

export async function aksKubectlGetPodsCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = `get pods --all-namespaces`;
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlGetClusterInfoCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = `cluster-info`;
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlGetAPIResourcesCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = `api-resources`;
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlGetNodeCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = `get node`;
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlDescribeServicesCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = `describe services`;
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlGetEventsCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = `get events --all-namespaces`;
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlK8sHealthzAPIEndpointCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = "get --raw /healthz?verbose";
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlK8sLivezAPIEndpointCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = "get --raw /livez?verbose";
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlK8sReadyzAPIEndpointCommands(
    _context: IActionContext,
    target: any
): Promise<void> {
    const command = "get --raw /readyz?verbose";
    await aksKubectlCommands(_context, target, command);
}

export async function aksKubectlCommands(
    _context: IActionContext,
    target: any,
    command: string
): Promise<void> {
    const kubectl = await k8s.extension.kubectl.v1;
    const cloudExplorer = await k8s.extension.cloudExplorer.v1;
    const clusterExplorer = await k8s.extension.clusterExplorer.v1;

    if (!kubectl.available) {
        vscode.window.showWarningMessage(`Kubectl is unavailable.`);
        return;
    }

    if (!cloudExplorer.available) {
        vscode.window.showWarningMessage(`Cloud explorer is unavailable.`);
        return;
    }

    if (!clusterExplorer.available) {
        vscode.window.showWarningMessage(`Cluster explorer is unavailable.`);
        return;
    }

    const clusterInfo = await getKubernetesClusterInfo(target, cloudExplorer, clusterExplorer);
    if (failed(clusterInfo)) {
        vscode.window.showErrorMessage(clusterInfo.error);
        return;
    }

    const extension = getExtension();
    if (failed(extension)) {
        vscode.window.showErrorMessage(extension.error);
        return;
    }

    const kubeConfigFile = await tmpfile.createTempFile(clusterInfo.result.kubeconfigYaml, "yaml");
    const dataProvider = new KubectlDataProvider(kubectl, kubeConfigFile.filePath, clusterInfo.result.name, command);
    const panel = new KubectlPanel(extension.result.extensionUri);

    panel.show(dataProvider, kubeConfigFile);
}
