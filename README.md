# Easy Neural Network Visualizer

![Easy Neural Network Visualizer Demo](https://res.cloudinary.com/dkomxncer/image/upload/f_auto,q_auto/scr7tbamlhdhezjao9y9)

An interactive web-based tool for visualizing and understanding neural networks in real-time. Built with Next.js, TypeScript, and TailwindCSS.

## 🌟 Features

- **Interactive Neural Network Visualization**
  - Real-time visualization of network architecture
  - Dynamic node and connection rendering
  - Weight and bias visualization
  - Forward and backward pass animation

- **Training Visualization**
  - Live training progress monitoring
  - Loss function plotting
  - Prediction visualization
  - Step-by-step training mode

- **Customizable Architecture**
  - Adjustable number of layers
  - Configurable neurons per layer
  - Multiple activation functions
  - Adjustable learning rate

- **Dataset Generation**
  - Custom function input
  - Automatic dataset generation
  - Train/test split visualization
  - Support for various mathematical functions

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JHM69/easy-nn.git
cd easy-nn
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Technical Details

### Stack
- **Frontend Framework**: Next.js 13 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Hooks
- **Neural Network**: Custom implementation with automatic differentiation

### Key Components

- **Neural Network Visualizer**: Interactive visualization of network architecture
- **Training Visualizer**: Real-time training progress and metrics
- **Function Input**: Mathematical function parser and dataset generator
- **Network Architecture**: Customizable network structure

## 🧮 Automatic Differentiation & Backpropagation

### Chain Rule Implementation

The network implements automatic differentiation using the chain rule of calculus for efficient gradient calculation during backpropagation. Each Value node in the computation graph tracks its own gradient.

## 🎯 Use Cases

1. **Educational**
   - Understanding neural network architectures
   - Visualizing training process
   - Learning backpropagation

2. **Research**
   - Quick prototyping of network architectures
   - Visual debugging of training issues
   - Parameter tuning visualization

3. **Development**
   - Testing different network configurations
   - Validating training approaches
   - Performance visualization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ✨ Credits

Developed by [@jhm69](https://github.com/JHM69)

## 🤔 Support

If you have any questions or run into issues, please open an issue in the GitHub repository.

---

Made with ❤️ by [Jahangir Hossain](https://github.com/JHM69)

