pipeline {
  agent any

  options {
    disableConcurrentBuilds()
  }

  tools {
    nodejs "NodeJS-20"
  }

  stages {
    stage("Install") {
      steps {
        sh '''
          set -e
          corepack enable
          corepack prepare pnpm@10.21.0 --activate
          pnpm --version
          pnpm install --frozen-lockfile
        '''
      }
    }

    stage("Prisma Generate") {
      steps {
        sh '''
          set -e
          corepack enable
          DATABASE_URL=postgresql://ci:ci@localhost:5432/ci pnpm exec prisma generate
        '''
      }
    }

    stage("Lint") {
      steps {
        sh '''
          set -e
          corepack enable
          pnpm run lint
        '''
      }
    }

    stage("Test") {
      steps {
        sh '''
          set -e
          corepack enable
          pnpm run test:cov
        '''
      }
    }

    stage("Build") {
      steps {
        sh '''
          set -e
          corepack enable
          pnpm run build
        '''
      }
    }

    stage("Docker Build") {
      steps {
        lock('docker-build') {
          sh "docker build -t auth-service:latest ."
        }
      }
    }
  }

  post {
    always {
      lock('docker-build') {
        sh 'docker image prune -f'
      }
    }
    success {
      echo "Pipeline OK - auth-service #${env.BUILD_NUMBER}"
      githubNotify credentialsId: 'github-token-userpass', status: 'SUCCESS', context: 'jenkins-ci', description: 'CI passed'
    }
    failure {
      echo "Pipeline FAILED - auth-service #${env.BUILD_NUMBER}"
      githubNotify credentialsId: 'github-token-userpass', status: 'FAILURE', context: 'jenkins-ci', description: 'CI failed'
    }
  }
}
