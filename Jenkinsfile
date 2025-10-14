pipeline {
  agent any

  environment {
    IMAGE = "dungsave123/chat-backend"
    DOCKER_CRED = 'dockerhub-cred'   // replace
    SSH_CRED = 'gcp-ssh-key'            // replace
    REMOTE_USER = 'dungsave123'         // replace
    REMOTE_HOST = '35.188.81.254'      // replace
    REMOTE_PROJECT_DIR = '/home/dinhtuanzzzaa/chat-as' // replace if different
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

    stage('Install & Test') {
      steps {
        dir('Be_ChatAs') {
          sh 'npm ci'
          sh 'npm test'   // nếu muốn failing pipeline khi test fail
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        sh "docker build -t ${IMAGE}:${IMAGE_TAG} -f ./backend/Dockerfile ./backend"
      }
    }

    stage('Push Images') {
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

    stage('Deploy') {
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
    success { echo "Deployed ${IMAGE}:${IMAGE_TAG}" }
    failure { echo "Pipeline failed." }
  }
}
