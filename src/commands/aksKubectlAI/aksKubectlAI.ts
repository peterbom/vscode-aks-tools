import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { getKubernetesClusterInfo, KubernetesClusterInfo } from '../utils/clusters';
import { getExtensionPath, longRunning } from '../utils/host';
import { Errorable, failed } from '../utils/errorable';
import { getKubectlAIBinaryPath } from '../utils/helper/kubectlAIDownload';
import * as tmpfile from '../utils/tempfile';
import path = require('path');
import { invokeKubectlCommand } from '../utils/kubectl';

enum Command {
    NginxDeployReplicas = "create an nginx deployment with 3 replicas"
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
    // const command = Command.NginxDeployReplicas;

    const command = await vscode.window.showInputBox({
        placeHolder: `Kubectl AI Command Query here: like "create an nginx deployment with 3 replicas"`,
        prompt:`Please enter Kubectl AI Prompt for generating manifest forexample: "create an nginx deployment with 3 replicas"`
      });

      if(command === '' || command == undefined){
        vscode.window.showErrorMessage('A command for kubectl ai is mandatory to execute this action');
        return;
      }

    return await runKubectlAIGadgetCommands(clustername, command, clusterConfig, kubectl);
}

async function runKubectlAIGadgetCommands(
    clustername: string,
    command: string,
    clusterConfig: string,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>) {

    const kubectlAIPath = await getKubectlAIBinaryPath();

    if (failed(kubectlAIPath)) {
        vscode.window.showWarningMessage(`kubectl-ai path was not found ${kubectlAIPath.error}`);
        return;
    }

    const extensionPath = getExtensionPath();
    // let t = vscode.window.createTerminal("test-1");
    // t.sendText(`export OPENAI_API_KEY=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`)
    // t.sendText(`/Users/tatsatmishra/.vs-kubernetes/tools/kubectlai/v0.0.6/kubectl-ai "create an nginx deployment with 3 replicas" --raw`); // new line is added by default to execute
    // vscode.window.showInformationMessage("test");

    await longRunning(`Running kubectl ai command on ${clustername}`,
        async () => {
            const commandToRun = `ai  --openai-api-key "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" "${command}" --raw`;
            const binaryPathDir = path.dirname(kubectlAIPath.result);

            if (process.env.PATH === undefined) {
                process.env.PATH = binaryPathDir
            } else if (process.env.PATH.indexOf(binaryPathDir) < 0) {
                process.env.PATH = binaryPathDir + path.delimiter + process.env.PATH;
            }

            const kubectlresult = await tmpfile.withOptionalTempFile<Errorable<k8s.KubectlV1.ShellResult>>(
                clusterConfig, "YAML", async (kubeConfigFile) => {
                    return await invokeKubectlCommand(kubectl, kubeConfigFile, commandToRun);
                });

            if (failed(kubectlresult)) {
                vscode.window.showWarningMessage(`kubectl ai command failed with following error: ${kubectlresult.error}`);
                return;
            }

            // const fileName = await tmpfile.withUntitledTempFile(kubectlresult.result.stderr, "YAML");
            vscode.workspace.openTextDocument({
                content: kubectlresult.result.stdout,
                language: "yaml"
            }).then(newDocument => {
                vscode.window.showTextDocument(newDocument);
            });
            
            // if (kubectlresult.succeeded) {
            //     vscode.workspace.openTextDocument(fileName);
            // }
        }
    );

    if (failed(extensionPath)) {
        vscode.window.showErrorMessage(extensionPath.error);
        return;
    }


}
