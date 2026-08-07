# ToDo App — AWS EKS GitOps Deployment

React ToDo app deployed on AWS EKS using Terraform, CircleCI, ArgoCD, and Prometheus/Grafana monitoring.

---

## Architecture

```
Developer → GitHub → CircleCI (test → build → push image → update manifest)
                                                              ↓
                                                    ArgoCD watches repo
                                                              ↓
                                              AWS EKS Cluster (ap-south-1)
                                              ├── todo-app pods (x2, HPA up to 5)
                                              ├── cluster-autoscaler
                                              └── monitoring namespace
                                                  ├── Prometheus
                                                  └── Grafana
```

**Infrastructure (Terraform):**
- VPC with public/private subnets across 2 AZs
- EKS cluster (v1.32) with managed node group (t3.small, 2–4 nodes)
- S3 + DynamoDB for Terraform remote state with locking

---

## CI/CD Pipeline (CircleCI)

Three sequential jobs triggered on every push to `main`:

| Job | What it does |
|-----|-------------|
| `test` | `npm ci` → `npm test` → `npm run build` (validates the app builds) |
| `build-and-push` | Builds Docker image, tags with `$CIRCLE_SHA1`, pushes to Docker Hub |
| `update-manifest` | `sed` replaces image tag in `k8s/deployment.yml`, commits & pushes back to GitHub |

ArgoCD detects the manifest change and syncs the new image to EKS automatically.

**Required CircleCI environment variables:**
```
DOCKER_USERNAME     # Docker Hub username
DOCKER_PASSWORD     # Docker Hub password/token
GITHUB_TOKEN        # GitHub personal access token (repo write)
GITHUB_EMAIL        # Git commit author email
```

---

## GitOps with ArgoCD

ArgoCD continuously reconciles the cluster state with `k8s/` in this repo.

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Apply the app definition
kubectl apply -f argocd-app.yml

# Get initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d

# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Open https://localhost:8080
```

`syncPolicy.automated` with `selfHeal: true` means any manual cluster change is reverted to match Git.

---

## Terraform Infrastructure

```bash
cd terraform

# Initialize (downloads providers + modules)
terraform init

# Preview changes
terraform plan

# Apply
terraform apply

# Configure kubectl after cluster creation
aws eks update-kubeconfig --region ap-south-1 --name todo-eks-cluster
```

---

## Kubernetes — Essential Commands

### Cluster Access & Info
```bash
# Verify cluster connection
kubectl cluster-info

# View nodes and their status
kubectl get nodes -o wide

# View all resources in default namespace
kubectl get all
```

### Deployments
```bash
# Check deployment status
kubectl get deployments

# View rollout status
kubectl rollout status deployment/todo-app

# Roll back to previous version
kubectl rollout undo deployment/todo-app

# Scale manually
kubectl scale deployment todo-app --replicas=3

# View deployment details (events, image, strategy)
kubectl describe deployment todo-app
```

### Pods
```bash
# List pods with node placement
kubectl get pods -o wide

# Stream logs from a pod
kubectl logs -f <pod-name>

# Execute a shell inside a pod
kubectl exec -it <pod-name> -- /bin/sh

# Describe pod (useful for crash debugging)
kubectl describe pod <pod-name>
```

### Services & Networking
```bash
# Get the LoadBalancer external IP
kubectl get svc todo-app-service

# Port-forward for local testing
kubectl port-forward svc/todo-app-service 8080:80
```

### HPA & Autoscaling
```bash
# Check HPA status (current vs target CPU)
kubectl get hpa

# Watch HPA scale in real time
kubectl get hpa -w
```

### Troubleshooting
```bash
# Pod stuck in Pending → check node resources
kubectl describe pod <pod-name> | grep -A5 Events

# Pod CrashLoopBackOff → check logs
kubectl logs <pod-name> --previous

# Check cluster events (last 1 hour)
kubectl get events --sort-by='.lastTimestamp'

# Check resource usage per node
kubectl top nodes

# Check resource usage per pod
kubectl top pods
```

---

## Monitoring (Prometheus + Grafana)

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yml

# Get Grafana LoadBalancer URL
kubectl get svc grafana -n monitoring

# Access Prometheus (port-forward)
kubectl port-forward svc/prometheus -n monitoring 9090:9090
```

**Grafana login:** `admin` / `admin123` (change after first login)

**Key metrics to watch:**
- Pod CPU/memory: `container_cpu_usage_seconds_total`, `container_memory_usage_bytes`
- Pod restarts: `kube_pod_container_status_restarts_total`
- HPA replica count: `kube_horizontalpodautoscaler_status_current_replicas`

---

## Full Deployment Flow (End-to-End)

```
1. terraform apply          → Creates VPC + EKS cluster
2. aws eks update-kubeconfig → Connects kubectl to cluster
3. kubectl apply -f k8s/    → Deploys app + HPA + autoscaler + monitoring
4. kubectl apply -f argocd-app.yml → Registers app with ArgoCD
5. git push origin main     → Triggers CircleCI pipeline
   └── test → build → push image → update k8s/deployment.yml
6. ArgoCD detects manifest change → Syncs new image to EKS
```
