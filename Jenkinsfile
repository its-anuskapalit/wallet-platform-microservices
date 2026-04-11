// WalletPlatform — CI pipeline (Linux agent with .NET 10 SDK on PATH).
// Jenkins: New Item → Pipeline → Pipeline script from SCM → point at this repo and branch.
// Windows agents: replace `sh` steps with `bat` and the same dotnet commands.

pipeline {
    agent any

    environment {
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        DOTNET_NOLOGO               = '1'
    }

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Restore') {
            steps {
                sh 'dotnet restore WalletPlatform.slnx'
            }
        }

        stage('Build') {
            steps {
                sh 'dotnet build WalletPlatform.slnx -c Release --no-restore'
            }
        }

        stage('Test') {
            steps {
                sh 'dotnet test WalletPlatform.slnx -c Release --no-restore --verbosity normal'
            }
        }

        // Optional: uncomment when Docker is available on the agent and you want image builds.
        // stage('Docker (example)') {
        //     steps {
        //         sh '''
        //           docker build -f docker/Dockerfile \
        //             --build-arg PROJECT_PATH=src/Services/WalletService/WalletService.API/WalletService.API.csproj \
        //             --build-arg APP_DLL=WalletService.API.dll \
        //             -t walletplatform-wallet:${BUILD_NUMBER} .
        //         '''
        //     }
        // }
    }

    post {
        failure {
            echo 'Build or tests failed — check console and test TRX/logs if published.'
        }
        success {
            echo 'CI completed successfully.'
        }
    }
}
