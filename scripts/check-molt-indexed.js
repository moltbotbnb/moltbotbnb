import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'
import { getStaticProject } from 'levr-sdk'

const MOLT_CONTRACT = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07'

const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org'),
})

async function main() {
  console.log('Checking if $MOLT is indexed...')
  console.log('Token:', MOLT_CONTRACT)
  console.log('Chain:', bsc.id)
  
  const staticProject = await getStaticProject({
    publicClient,
    clankerToken: MOLT_CONTRACT,
  })
  
  if (staticProject) {
    console.log('\n✅ $MOLT is indexed!')
    console.log('Static Project:', JSON.stringify(staticProject, null, 2))
  } else {
    console.log('\n❌ $MOLT is NOT indexed in the Levr indexer')
    console.log('This means staking via SDK won\'t work until indexed')
  }
}

main().catch(console.error)
