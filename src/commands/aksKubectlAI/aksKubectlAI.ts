import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { getKubernetesClusterInfo, KubernetesClusterInfo } from '../utils/clusters';
import { getExtensionPath } from '../utils/host';
import { failed } from '../utils/errorable';
import { getKubectlAIBinaryPath } from '../utils/helper/kubectlAIDownload';

enum Command {
    NginxDeployReplicas="create an nginx deployment"
}

export async function aksKubectlAIDeploy(
    _context: IActionContext,
    target: any
): Promise<void> {
    await checkTargetAndRunKubectlAICommand(target, Command.NginxDeployReplicas)
}

async function checkTargetAndRunKubectlAICommand(
    target: any,
    cmd: Command
): Promise<void> {
    const kubectl = await k8s.extension.kubectl.v1;
    const cloudExplorer = await k8s.extension.cloudExplorer.v1;
    const clusterExplorer = await k8s.extension.clusterExplorer.v1;

    if (!kubectl.available) {
        vscode.window.showWarningMessage(`Kubectl is unavailable.`);
        return undefined;
    }

    if (!cloudExplorer.available) {
        vscode.window.showWarningMessage(`Cloud explorer is unavailable.`);
        return undefined;
    }

    if (!clusterExplorer.available) {
        vscode.window.showWarningMessage(`Cluster explorer is unavailable.`);
        return undefined;
    }

    const clusterInfo = await getKubernetesClusterInfo(target, cloudExplorer, clusterExplorer);
    if (failed(clusterInfo)) {
        vscode.window.showErrorMessage(clusterInfo.error);
        return undefined;
    }

    await runGadgetCommand(clusterInfo.result, cmd, kubectl);
}

async function runGadgetCommand(
    clusterInfo: KubernetesClusterInfo,
    cmd: Command,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>
): Promise<void> {
    const clustername = clusterInfo.name;
    const kubeconfig = clusterInfo.kubeconfigYaml;

    switch (cmd) {
        case Command.NginxDeployReplicas:
            await nginxDeployReplicas(clustername, kubeconfig, kubectl);
            return;
    }
}

async function nginxDeployReplicas(
    clustername: string,
    clusterConfig: string,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>) {
    const command = Command.NginxDeployReplicas;

    return await runKubectlAIGadgetCommands(clustername, command, clusterConfig, kubectl);
}

async function runKubectlAIGadgetCommands(
    clustername: string,
    command: string,
    clusterConfig: string,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>) {

    const kubectlGadgetPath = await getKubectlAIBinaryPath();

    if (failed(kubectlGadgetPath)) {
        vscode.window.showWarningMessage(`kubectl gadget path was not found ${kubectlGadgetPath.error}`);
        return;
    }

    const extensionPath = getExtensionPath();

    if (failed(extensionPath)) {
        vscode.window.showErrorMessage(extensionPath.error);
        return;
    }

    
}
