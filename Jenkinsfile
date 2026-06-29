pipeline {
  agent any

  tools {
    nodejs "NodeJS-20"
  }

  stages {
    stage("Install") {
      steps {
        sh "npm install -g pnpm"
        sh "pnpm install --frozen-lockfile"
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
    }
    failure {
      echo "Pipeline FAILED - auth-service #${env.BUILD_NUMBER}"
    }
  }
}
