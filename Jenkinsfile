pipeline {
  agent any

  tools {
    nodejs "NodeJS-20"
  }

  stages {
    stage("Install") {
      steps {
        sh "npm install -g pnpm@10.21.0"
        sh "pnpm install --frozen-lockfile"
      }
    }

    stage("Prisma Generate") {
      steps {
        sh "DATABASE_URL=postgresql://ci:ci@localhost:5432/ci pnpm exec prisma generate"
      }
    }

    stage("Lint") {
      steps {
        sh "pnpm run lint"
      }
    }

    stage("Test") {
      steps {
        sh "pnpm run test:cov"
      }
    }

    stage("Build") {
      steps {
        sh "pnpm run build"
      }
    }

    stage("Docker Build") {
      steps {
        sh "docker build -t auth-service:${env.BUILD_NUMBER} ."
      }
    }
  }

  post {
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
