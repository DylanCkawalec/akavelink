# Contributing to Akavelink

Thank you for your interest in contributing to the Akavelink template! This guide covers both contributing to the codebase and submitting this template to Phala Cloud's template marketplace.

## 🚀 Submitting as a Phala Cloud Template

This repository is designed to be deployed as a template on Phala Cloud. To submit it to the template marketplace:

### Prerequisites
1. **Working Docker Image**: Ensure `dylanckawalec/akavelink:latest` is publicly accessible on Docker Hub
2. **Tested Deployment**: Verify the template works with the provided `docker-compose.yml`
3. **Documentation**: Ensure README.md clearly explains deployment steps

### Submission Steps

1. **Prepare Template Configuration**
   Create `templates/config.json` with your template metadata:
   ```json
   {
     "id": "akavelink",
     "name": "Akavelink - Decentralized Storage API",
     "description": "REST API wrapper for Akave decentralized storage with interactive UI",
     "category": "Storage",
     "author": "Dylan Kawalec",
     "repository": "https://github.com/DylanCkawalec/akavelink",
     "docker_image": "dylanckawalec/akavelink:latest",
     "port": 80,
     "environment_variables": [
       {
         "name": "NODE_ADDRESS",
         "description": "Akave node endpoint",
         "required": true,
         "default": "connect.akave.ai:5500"
       },
       {
         "name": "PRIVATE_KEY",
         "description": "Your Ethereum private key for Akave",
         "required": true,
         "secret": true
       },
       {
         "name": "PORT",
         "description": "API server port",
         "required": false,
         "default": "80"
       },
       {
         "name": "CORS_ORIGIN",
         "description": "Allowed CORS origins",
         "required": false,
         "default": "*"
       },
       {
         "name": "DEBUG",
         "description": "Enable debug logging",
         "required": false,
         "default": "true"
       }
     ],
     "minimum_resources": {
       "vcpu": 1,
       "memory": 1024,
       "disk": 10
     },
     "recommended_resources": {
       "vcpu": 2,
       "memory": 2048,
       "disk": 20
     }
   }
   ```

2. **Add Template Icon**
   - Copy `icon.png` to `templates/icons/akavelink.png`
   - Icon should be 512x512px PNG format

3. **Ensure Docker Compose is Ready**
   The `docker-compose.yml` must:
   - Use environment variables for configuration
   - Map port 80 (Phala gateway handles external routing)
   - Include health checks
   - Mount `/var/run/tappd.sock` for TEE attestation

4. **Add Deploy Button to README**
   ```markdown
   [![Deploy to Phala Cloud](https://cloud.phala.network/deploy-button.svg)](https://cloud.phala.network/templates/akavelink)
   ```

5. **Submit to Phala Cloud**
   - Fork the [Awesome Phala Cloud](https://github.com/Phala-Network/awesome-phala-cloud) repository
   - Add your template to the templates list
   - Create a Pull Request with your template information

## 🔧 Contributing to the Codebase

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/DylanCkawalec/akavelink
   cd akavelink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Akave private key
   ```

4. **Run locally with Docker**
   ```bash
   ./launch.sh
   ```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style
   - Update tests if needed
   - Update documentation

3. **Test your changes**
   ```bash
   # Run unit tests
   npm test
   
   # Test with Docker
   docker build -t akavelink:test .
   docker run -p 8000:80 -e NODE_ADDRESS=connect.akave.ai:5500 -e PRIVATE_KEY=your_key akavelink:test
   ```

4. **Submit a Pull Request**
   - Push your branch to GitHub
   - Create a PR with a clear description
   - Link any related issues

### Code Style Guidelines

- Use ES6+ JavaScript features
- Follow existing indentation (2 spaces)
- Add JSDoc comments for new functions
- Keep functions small and focused
- Handle errors gracefully

### Testing Guidelines

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test both success and error cases
- Test with actual Akave network when possible

## 📝 Documentation

When contributing, please update:
- **README.md**: For user-facing changes
- **API docs**: For new endpoints
- **Code comments**: For complex logic
- **Environment variables**: Document any new config

## 🐛 Reporting Issues

Please use GitHub Issues to report bugs or request features:
1. Check existing issues first
2. Provide clear reproduction steps
3. Include error messages and logs
4. Specify your environment (OS, Node version, etc.)

## 💡 Feature Requests

We welcome feature suggestions! Please:
1. Open an issue with `[Feature Request]` prefix
2. Describe the use case
3. Explain expected behavior
4. Consider submitting a PR if you can implement it

## 🔒 Security

For security issues:
- **DO NOT** open public issues
- Email security concerns to the maintainer
- Include steps to reproduce
- Allow time for a fix before disclosure

## 📄 License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

## 🙏 Thank You!

Your contributions make this template better for everyone in the Phala ecosystem. Whether you're fixing bugs, adding features, improving docs, or submitting the template - every contribution matters!

---

**Questions?** Join the [Phala Discord](https://discord.gg/phala) or open an issue.