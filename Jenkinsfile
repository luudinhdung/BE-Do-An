pipeline {
  agent {
    docker {
      image 'node:20'
      args '-u root:root -v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  environment {
    IMAGE = "dungsave123/chat-backend"
    DOCKER_CRED = 'dockerhub-credentials'
    SSH_CRED = 'gcp-ssh-key'
    REMOTE_USER = 'dungsave123'
    REMOTE_HOST = '35.188.81.254'
    REMOTE_PROJECT_DIR = '/home/dinhtuanzzzaa/chat-as'
    UPSTASH_REDIS_REST_URL = 'https://emerging-chipmunk-11349.upstash.io'
    UPSTASH_REDIS_REST_TOKEN = 'ASxVAAIjcDE5ZjM2Y2JkYzZhYTA0YWU2OGRlMTk1YWQ1NDI1OWVmYnAxMA'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          GIT_SHORT = sh(returnStdout: true, script: "git rev-parse --short HEAD").trim()
          env.IMAGE_TAG = "${GIT_SHORT}"
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          ls -la
          ls -la prisma || true
          npm ci
          npx prisma generate --schema=./prisma/schema.prisma
        '''
      }
    }

    stage('Build Docker Image') {
      steps {
        dir('Be_ChatAs') {
          sh "docker build -t ${IMAGE}:${IMAGE_TAG} ."
        }
      }
    }

    stage('Push Docker Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
            docker push ${IMAGE}:${IMAGE_TAG}
            docker tag ${IMAGE}:${IMAGE_TAG} ${IMAGE}:latest
            docker push ${IMAGE}:latest
          '''
        }
      }
    }

    stage('Deploy to Remote VM') {
      steps {
        sshagent([SSH_CRED]) {
          sh """
            ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} '
              cd ${REMOTE_PROJECT_DIR} &&
              docker compose pull chat-backend || true &&
              docker compose up -d chat-backend
            '
          """
        }
      }
    }
  }

  post {
    success {
      echo "✅ Successfully deployed ${IMAGE}:${IMAGE_TAG}"
    }
    failure {
      echo "❌ Pipeline failed."
    }
  }
}
