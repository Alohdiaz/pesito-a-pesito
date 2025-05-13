// Importa el entorno de Hardhat Runtime Environment (HRE)
const hre = require('hardhat')

async function main() {
  console.log('Deploying SubscriptionManager contract...')

  // Obtiene la "fábrica de contratos" para SubscriptionManager
  const SubscriptionManager = await hre.ethers.getContractFactory(
    'SubscriptionManager'
  )

  // Despliega el contrato en la red configurada (ej. Sepolia)
  const subscriptionManager = await SubscriptionManager.deploy()

  // Espera a que finalice el despliegue
  await subscriptionManager.waitForDeployment()
  // Obtiene y muestra la dirección del contrato desplegado
  const address = await subscriptionManager.getAddress()
  console.log('SubscriptionManager deployed to:', address)
  // Mensaje indicando que se debe actualizar la variable de entorno
  console.log(
    'Update your NEXT_PUBLIC_CONTRACT_ADDRESS environment variable with this address'
  )

  // Espera 5 confirmaciones para permitir la verificación en Etherscan
  console.log('Waiting for confirmations...')
  await hre.ethers.provider.waitForTransaction(
    subscriptionManager.deploymentTransaction().hash,
    5
  )

  // Verifica el contrato en Etherscan si se proporciona una API key
  const { ETHERSCAN_API_KEY } = process.env
  if (ETHERSCAN_API_KEY) {
    console.log('Verifying contract on Etherscan...')
    try {
      await hre.run('verify:verify', {
        address: address,
        constructorArguments: []
      })
      console.log('Contract verified on Etherscan!')
    } catch (error) {
      console.error('Error verifying contract:', error)
    }
  } else {
    console.log('Skipping Etherscan verification - no API key provided')
  }
}

// Ejecuta la función principal de despliegue
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })