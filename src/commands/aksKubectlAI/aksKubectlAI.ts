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

var shelljs = require('shelljs');

enum Command {
    KubectlAICommand,
    BuildUpAICommandFromPreviousRun
}

export async function aksKubectlAIDeploy(
    _context: IActionContext,
    target: any
): Promise<void> {
    await checkTargetAndRunKubectlAICommand(target, Command.KubectlAICommand)
}

export async function aksKubectlAIRePrompt(
    _context: IActionContext,
    target: any
): Promise<void> {
    await checkTargetAndRunKubectlAICommand(target, Command.BuildUpAICommandFromPreviousRun)
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

    await runKubectlAICommand(clusterInfo.result, cmd, kubectl);
}

async function runKubectlAICommand(
    clusterInfo: KubernetesClusterInfo,
    cmd: Command,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>
): Promise<void> {
    const clustername = clusterInfo.name;
    const kubeconfig = clusterInfo.kubeconfigYaml;

    switch (cmd) {
        case Command.KubectlAICommand:
            await execKubectlAICommand(clustername, kubeconfig, kubectl);
            return;
        case Command.BuildUpAICommandFromPreviousRun:
            await buildUpAICommandFromPreviousRun(clustername, kubeconfig, kubectl);
            return;
    }
}

async function execKubectlAICommand(
    clustername: string,
    clusterConfig: string,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>) {

    // Identify the env var: OPENAI_API_KEY exist if not get input for ai key
    console.log(process.env.OPENAI_API_KEY);
    let openAIKey = process.env.OPENAI_API_KEY ?? process.env.VSCODE_OPEN_AI_AKS_POC;

    if (openAIKey == undefined && (process.env.VSCODE_OPEN_AI_AKS_POC === '' || process.env.VSCODE_OPEN_AI_AKS_POC == undefined)) {
        const aiKey = await vscode.window.showInputBox({
            placeHolder: `Please supply a valid Open AI or Azure OpenAI Key"`
        });

        if (aiKey == undefined) {
            // vscode.window.showErrorMessage('A valid aikey is mandatory to execute this action');
            return;
        }
        process.env.VSCODE_OPEN_AI_AKS_POC = aiKey;
        openAIKey = aiKey || process.env.VSCODE_OPEN_AI_AKS_POC;
    }

    const command = await vscode.window.showInputBox({
        placeHolder: `Kubectl AI Command Query here: like "create an nginx deployment with 3 replicas"`,
        prompt: `Please enter Kubectl AI Prompt for generating manifest forexample: "create an nginx deployment with 3 replicas"`
    });

    if (command === '' || command == undefined) {
        vscode.window.showErrorMessage('A command for kubectl ai is mandatory to execute this action');
        return;
    }

    return await runKubectlAIGadgetCommands(clustername, openAIKey!, command, clusterConfig, false, kubectl);
}

async function runKubectlAIGadgetCommands(
    clustername: string,
    aiKey: string,
    command: string,
    clusterConfig: string,
    rePromptMode: boolean,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>) {

    const kubectlAIPath = await getKubectlAIBinaryPath();

    if (failed(kubectlAIPath)) {
        vscode.window.showWarningMessage(`kubectl-ai path was not found ${kubectlAIPath.error}`);
        return;
    }

    const extensionPath = getExtensionPath();

    await longRunning(`Running kubectl ai command on ${clustername}`,
        async () => {
            let commandToRun = `ai  --openai-api-key "${aiKey}" "${command}" --raw`;

            const binaryPathDir = path.dirname(kubectlAIPath.result);

            if (process.env.PATH === undefined) {
                process.env.PATH = binaryPathDir
            } else if (process.env.PATH.indexOf(binaryPathDir) < 0) {
                process.env.PATH = binaryPathDir + path.delimiter + process.env.PATH;
            }

            if (rePromptMode) {
                const data = vscode.window.activeTextEditor?.document;
                const tmpFileName = await tmpfile.createTempFile(data?.getText()!, "YAML");
                commandToRun = `cat ${tmpFileName} | kubectl ai  --openai-api-key "${aiKey}" "${command}" --raw`
                shelljs.exec(commandToRun, function (code: any, stdout: any, stderr: any) {
                    console.log('Exit code:', code);
                    console.log('Program output:', stdout);
                    console.log('Program stderr:', stderr);
                    // Open data in editor.
                    vscode.workspace.openTextDocument({
                        content: stdout,
                        language: "yaml"
                    }).then(newDocument => {
                        vscode.window.showTextDocument(newDocument);
                    });
                });


                return;
            }

            const kubectlresult = await tmpfile.withOptionalTempFile<Errorable<k8s.KubectlV1.ShellResult>>(
                clusterConfig, "YAML", async (kubeConfigFile) => {
                    return await invokeKubectlCommand(kubectl, kubeConfigFile, commandToRun);
                });

            if (failed(kubectlresult)) {
                vscode.window.showWarningMessage(`kubectl-ai command failed with following error: ${kubectlresult.error}`);
                return;
            }

            // Open data in editor.
            vscode.workspace.openTextDocument({
                content: kubectlresult.result.stdout,
                language: "yaml"
            }).then(newDocument => {
                vscode.window.showTextDocument(newDocument);
            });
        }
    );

    if (failed(extensionPath)) {
        vscode.window.showErrorMessage(extensionPath.error);
        return;
    }

}

async function buildUpAICommandFromPreviousRun(
    clustername: string,
    clusterConfig: string,
    kubectl: k8s.APIAvailable<k8s.KubectlV1>) {

    // Identify the env var: OPENAI_API_KEY exist if not get input for ai key
    console.log(process.env.OPENAI_API_KEY);
    let openAIKey = process.env.OPENAI_API_KEY ?? process.env.VSCODE_OPEN_AI_AKS_POC;

    if (openAIKey == undefined && (process.env.VSCODE_OPEN_AI_AKS_POC === '' || process.env.VSCODE_OPEN_AI_AKS_POC == undefined)) {
        const aiKey = await vscode.window.showInputBox({
            placeHolder: `Please supply a valid Open AI or Azure OpenAI Key"`
        });

        if (aiKey == undefined) {
            vscode.window.showErrorMessage('A valid aikey is mandatory to execute this action');
            return;
        }
        process.env.VSCODE_OPEN_AI_AKS_POC = aiKey;
        openAIKey = aiKey || process.env.VSCODE_OPEN_AI_AKS_POC;
    }

    const command = await vscode.window.showInputBox({
        placeHolder: `Kubectl AI Command Query here: like "create an nginx deployment with 3 replicas"`,
        prompt: `Please enter Kubectl AI Prompt for generating manifest forexample: "create an nginx deployment with 3 replicas"`
    });

    if (command === '' || command == undefined) {
        vscode.window.showErrorMessage('A command for kubectl ai is mandatory to execute this action');
        return;
    }

    return await runKubectlAIGadgetCommands(clustername, openAIKey!, command, clusterConfig, true, kubectl);
}