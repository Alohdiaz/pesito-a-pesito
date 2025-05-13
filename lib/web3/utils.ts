import { ethers } from 'ethers'
import SubscriptionManagerABI from './SubscriptionManagerABI.json'

// Dirección del contrato desplegado en la red de prueba Sepolia
export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' // Replace with actual deployed contract

// Configuración de la red Sepolia para Metamask
export const NETWORK_CONFIG = {
  chainId: '0xaa36a7', // ID de la red Sepolia en formato hexadecimal
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}

/**
 * Conecta el navegador con Metamask y se asegura de estar en la red Sepolia
 */
export async function connectWallet(): Promise<ethers.BrowserProvider | null> {
  if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
    console.error('MetaMask not installed!')
    return null
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' })

    const chainId = await window.ethereum.request({ method: 'eth_chainId' })

    if (chainId !== NETWORK_CONFIG.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainId }]
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [NETWORK_CONFIG]
            })
          } catch (addError) {
            console.error('Failed to add network to MetaMask:', addError)
            return null
          }
        } else {
          console.error('Failed to switch network in MetaMask:', switchError)
          return null
        }
      }
    }

    return new ethers.BrowserProvider(window.ethereum)
  } catch (error) {
    console.error('Failed to connect wallet:', error)
    return null
  }
}

/**
 * Devuelve una instancia del contrato de suscripción
 */
export function getSubscriptionContract(
  provider: ethers.BrowserProvider
): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, SubscriptionManagerABI, provider)
}

/**
 * Llama al método de compra de suscripción en el contrato
 */
export async function purchaseSubscription(
  provider: ethers.BrowserProvider
): Promise<{ txHash: string } | null> {
  try {
    const contract = getSubscriptionContract(provider)
    const signer = await provider.getSigner()
    const contractWithSigner = contract.connect(signer)
    const price = await contract.monthlySubscriptionPrice()
    const tx = await (contractWithSigner as any).purchaseSubscription({
      value: price
    })
    const receipt = await tx.wait()

    if (!receipt || !receipt.hash) {
      throw new Error('Transaction failed')
    }

    return { txHash: receipt.hash }
  } catch (error) {
    console.error('Failed to purchase subscription:', error)
    return null
  }
}

/**
 * Cancela la suscripción del usuario llamando al contrato
 */
export async function cancelSubscription(
  provider: ethers.BrowserProvider
): Promise<boolean> {
  try {
    const contract = getSubscriptionContract(provider)
    const signer = await provider.getSigner()
    const contractWithSigner = contract.connect(signer)
    const tx = await (contractWithSigner as any)['cancelSubscription']()
    const receipt = await tx.wait()

    return !!receipt
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    return false
  }
}

/**
 * Verifica si una dirección tiene una suscripción activa
 */
export async function checkSubscription(
  address: string,
  provider: ethers.BrowserProvider
): Promise<boolean> {
  try {
    const contract = getSubscriptionContract(provider)

    return await contract['hasActiveSubscription'](address)
  } catch (error) {
    console.error('Failed to check subscription:', error)
    return false
  }
}

/**
 * Devuelve un enlace a un faucet de Sepolia para obtener ETH de prueba
 */
export function getSepoliaFaucetLink(): string {
  return 'https://sepoliafaucet.com/'
}

// Declaración para que TypeScript reconozca window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}