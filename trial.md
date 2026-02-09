Here's the full implementation plan broken down into concrete, actionable work:                                                               
                                                                                                                                                
    ---                                                                                                                                         
    TriggerPay Implementation Plan                                                                                                              
                                                                                                                                                
    Project Structure                                                                                                                           
                                                                                                                                                
    TriggerPay/                                                                                                                                 
    ├── contracts/                    # NEAR smart contract (Rust)                                                                              
    │   └── triggerpay/                                                                                                                         
    │       ├── Cargo.toml                                                                                                                      
    │       └── src/                                                                                                                            
    │           ├── lib.rs           # Main contract entry                                                                                      
    │           ├── trigger.rs       # Trigger struct & logic                                                                                   
    │           ├── attestation.rs   # Attestation verification                                                                                 
    │           ├── payout.rs        # Chain Signatures integration                                                                             
    │           └── views.rs         # View methods                                                                                             
    │                                                                                                                                           
    ├── app/                          # Next.js frontend + API                                                                                  
    │   ├── app/                                                                                                                                
    │   │   ├── page.tsx             # Landing page                                                                                             
    │   │   ├── create/page.tsx      # Create trigger form                                                                                      
    │   │   ├── dashboard/page.tsx   # Active triggers view                                                                                     
    │   │   └── api/                                                                                                                            
    │   │       ├── flight/[number]/route.ts  # Mock flight API                                                                                 
    │   │       └── admin/set-status/route.ts # Demo control                                                                                    
    │   ├── components/                                                                                                                         
    │   │   ├── WalletConnect.tsx                                                                                                               
    │   │   ├── TriggerForm.tsx                                                                                                                 
    │   │   ├── TriggerCard.tsx                                                                                                                 
    │   │   └── StatusBadge.tsx                                                                                                                 
    │   └── lib/                                                                                                                                
    │       ├── near.ts              # NEAR client setup                                                                                        
    │       └── contract.ts          # Contract interaction helpers                                                                             
    │                                                                                                                                           
    ├── agent/                        # Shade Agent (Node.js)                                                                                   
    │   ├── package.json                                                                                                                        
    │   ├── src/                                                                                                                                
    │   │   ├── index.ts             # Main polling loop                                                                                        
    │   │   ├── monitor.ts           # Trigger monitoring logic                                                                                 
    │   │   ├── attestation.ts       # Attestation generation                                                                                   
    │   │   └── near-client.ts       # Contract interaction                                                                                     
    │   └── .env                     # Agent credentials                                                                                        
    │                                                                                                                                           
    └── README.md                                                                                                                               
                                                                                                                                                
    ---                                                                                                                                         
    Phase 1: Foundation (Days 1-4)                                                                                                              
                                                                                                                                                
    Day 1-2: Smart Contract Core                                                                                                                
    ┌──────┬───────────────────────────────────────┬──────────────────────────────────────────────────┐                                         
    │ Task │              Description              │                   Deliverable                    │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.1  │ Initialize Rust project with near-sdk │ Cargo.toml configured                            │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.2  │ Define core types                     │ Trigger, Condition, Payout, Status structs       │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.3  │ Implement storage                     │ LookupMap for triggers, user_triggers            │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.4  │ create_trigger()                      │ Payable method, validates inputs, stores trigger │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.5  │ get_trigger() / get_user_triggers()   │ View methods for frontend                        │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.6  │ get_active_triggers()                 │ View method for agent polling                    │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.7  │ Unit tests                            │ Test creation, storage, retrieval                │                                         
    ├──────┼───────────────────────────────────────┼──────────────────────────────────────────────────┤                                         
    │ 1.8  │ Deploy to testnet                     │ triggerpay.testnet                               │                                         
    └──────┴───────────────────────────────────────┴──────────────────────────────────────────────────┘                                         
    Contract interface:                                                                                                                         
    #[payable]                                                                                                                                  
    pub fn create_trigger(condition: Condition, payout: Payout) -> TriggerId;                                                                   
    pub fn get_trigger(trigger_id: TriggerId) -> Option<TriggerView>;                                                                           
    pub fn get_user_triggers(account_id: AccountId) -> Vec<TriggerView>;                                                                        
    pub fn get_active_triggers() -> Vec<TriggerView>;                                                                                           
                                                                                                                                                
    Day 3-4: Frontend + Mock API                                                                                                                
    ┌──────┬─────────────────────────────────────┬───────────────────────────────────────────┐                                                  
    │ Task │             Description             │                Deliverable                │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.1  │ Initialize Next.js 14 with Tailwind │ Base app structure                        │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.2  │ Mock Flight API                     │ GET /api/flight/[number] returns status   │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.3  │ Admin endpoint                      │ POST /api/admin/set-status for demo       │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.4  │ NEAR wallet integration             │ @near-wallet-selector setup               │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.5  │ Landing page                        │ Hero + "Connect Wallet" CTA               │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.6  │ Create trigger form                 │ Flight input, payout config, cost display │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.7  │ Dashboard page                      │ List active triggers with status cards    │                                                  
    ├──────┼─────────────────────────────────────┼───────────────────────────────────────────┤                                                  
    │ 2.8  │ Contract connection                 │ Call create_trigger from UI               │                                                  
    └──────┴─────────────────────────────────────┴───────────────────────────────────────────┘                                                  
    ---                                                                                                                                         
    Phase 2: Agent + Attestations (Days 5-8)                                                                                                    
                                                                                                                                                
    Day 5-6: Monitoring Agent                                                                                                                   
    ┌──────┬──────────────────────────┬────────────────────────────────────┐                                                                    
    │ Task │       Description        │            Deliverable             │                                                                    
    ├──────┼──────────────────────────┼────────────────────────────────────┤                                                                    
    │ 3.1  │ Initialize Node.js agent │ TypeScript project setup           │                                                                    
    ├──────┼──────────────────────────┼────────────────────────────────────┤                                                                    
    │ 3.2  │ NEAR client setup        │ Connect to testnet, load contract  │                                                                    
    ├──────┼──────────────────────────┼────────────────────────────────────┤                                                                    
    │ 3.3  │ Polling loop             │ Fetch active triggers every 15 min │                                                                    
    ├──────┼──────────────────────────┼────────────────────────────────────┤                                                                    
    │ 3.4  │ Flight API integration   │ Query mock API for each trigger    │                                                                    
    ├──────┼──────────────────────────┼────────────────────────────────────┤                                                                    
    │ 3.5  │ Condition evaluation     │ Check if status === "cancelled"    │                                                                    
    ├──────┼──────────────────────────┼────────────────────────────────────┤                                                                    
    │ 3.6  │ Logging                  │ Visible output for demo terminal   │                                                                    
    └──────┴──────────────────────────┴────────────────────────────────────┘                                                                    
    Day 7-8: Attestation System                                                                                                                 
    ┌──────┬──────────────────────────────────┬────────────────────────────────────────────┐                                                    
    │ Task │           Description            │                Deliverable                 │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.1  │ Attestation schema               │ Define hash structure                      │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.2  │ Agent: Generate attestation      │ Hash trigger_id + timestamp + response     │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.3  │ Agent: Sign attestation          │ Ed25519 signature (TEE key simulation)     │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.4  │ Contract: submit_attestation()   │ Accept and verify attestation              │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.5  │ Contract: Signature verification │ Validate TEE signature on-chain            │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.6  │ Contract: Store attestations     │ Track attestation history per trigger      │                                                    
    ├──────┼──────────────────────────────────┼────────────────────────────────────────────┤                                                    
    │ 4.7  │ Test full flow                   │ Create → Agent checks → Attestation stored │                                                    
    └──────┴──────────────────────────────────┴────────────────────────────────────────────┘                                                    
    Attestation structure:                                                                                                                      
    struct Attestation {                                                                                                                        
        trigger_id: String,                                                                                                                     
        timestamp: u64,                                                                                                                         
        api_response_hash: [u8; 32],                                                                                                            
        condition_met: bool,                                                                                                                    
        signature: [u8; 64],                                                                                                                    
    }                                                                                                                                           
                                                                                                                                                
    ---                                                                                                                                         
    Phase 3: Cross-Chain Payout (Days 9-12)                                                                                                     
                                                                                                                                                
    Day 9-10: Chain Signatures Integration                                                                                                      
    ┌──────┬────────────────────────────┬─────────────────────────────────────┐                                                                 
    │ Task │        Description         │             Deliverable             │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.1  │ Study Chain Signatures SDK │ Understand MPC signing flow         │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.2  │ Register derivation path   │ "ethereum-1" for TriggerPay         │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.3  │ Derive Ethereum address    │ Get address controlled by contract  │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.4  │ Fund derived address       │ Send Sepolia ETH for payouts        │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.5  │ Build ETH transaction      │ Construct unsigned tx in contract   │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.6  │ Request MPC signature      │ Call v1.signer-prod.testnet         │                                                                 
    ├──────┼────────────────────────────┼─────────────────────────────────────┤                                                                 
    │ 5.7  │ Test signing               │ Verify we get valid ECDSA signature │                                                                 
    └──────┴────────────────────────────┴─────────────────────────────────────┘                                                                 
    Day 11-12: Payout Execution                                                                                                                 
    ┌──────┬────────────────────────┬──────────────────────────────────────────────────────┐                                                    
    │ Task │      Description       │                     Deliverable                      │                                                    
    ├──────┼────────────────────────┼──────────────────────────────────────────────────────┤                                                    
    │ 6.1  │ Complete payout flow   │ submit_attestation triggers signing on condition_met │                                                    
    ├──────┼────────────────────────┼──────────────────────────────────────────────────────┤                                                    
    │ 6.2  │ Transaction broadcast  │ Relayer or callback to send signed tx                │                                                    
    ├──────┼────────────────────────┼──────────────────────────────────────────────────────┤                                                    
    │ 6.3  │ Update trigger status  │ Mark as Executed with tx hash                        │                                                    
    ├──────┼────────────────────────┼──────────────────────────────────────────────────────┤                                                    
    │ 6.4  │ claim_refund()         │ Return funds if trigger expires unmet                │                                                    
    ├──────┼────────────────────────┼──────────────────────────────────────────────────────┤                                                    
    │ 6.5  │ End-to-end test        │ Condition met → ETH arrives on Sepolia               │                                                    
    ├──────┼────────────────────────┼──────────────────────────────────────────────────────┤                                                    
    │ 6.6  │ Frontend: Show tx hash │ Link to Etherscan on executed triggers               │                                                    
    └──────┴────────────────────────┴──────────────────────────────────────────────────────┘                                                    
    ---                                                                                                                                         
    Phase 4: Polish + Demo (Days 13-18)                                                                                                         
                                                                                                                                                
    Day 13-14: UI Polish                                                                                                                        
    ┌──────┬─────────────────────┬───────────────────────────────────────┐                                                                      
    │ Task │     Description     │              Deliverable              │                                                                      
    ├──────┼─────────────────────┼───────────────────────────────────────┤                                                                      
    │ 7.1  │ Loading states      │ Skeleton loaders, transaction pending │                                                                      
    ├──────┼─────────────────────┼───────────────────────────────────────┤                                                                      
    │ 7.2  │ Error handling      │ User-friendly error messages          │                                                                      
    ├──────┼─────────────────────┼───────────────────────────────────────┤                                                                      
    │ 7.3  │ Transaction history │ Past triggers view                    │                                                                      
    ├──────┼─────────────────────┼───────────────────────────────────────┤                                                                      
    │ 7.4  │ Visual polish       │ Demo-ready styling                    │                                                                      
    ├──────┼─────────────────────┼───────────────────────────────────────┤                                                                      
    │ 7.5  │ Mobile responsive   │ Works on phone for demo               │                                                                      
    └──────┴─────────────────────┴───────────────────────────────────────┘                                                                      
    Day 15-16: Agent Hardening                                                                                                                  
    ┌──────┬────────────────────────┬──────────────────────────────────┐                                                                        
    │ Task │      Description       │           Deliverable            │                                                                        
    ├──────┼────────────────────────┼──────────────────────────────────┤                                                                        
    │ 8.1  │ Retry logic            │ Handle API failures gracefully   │                                                                        
    ├──────┼────────────────────────┼──────────────────────────────────┤                                                                        
    │ 8.2  │ Proper logging format  │ Clean terminal output for demo   │                                                                        
    ├──────┼────────────────────────┼──────────────────────────────────┤                                                                        
    │ 8.3  │ 24-hour stability test │ Agent runs without intervention  │                                                                        
    ├──────┼────────────────────────┼──────────────────────────────────┤                                                                        
    │ 8.4  │ TEE documentation      │ Explain Shade Agent architecture │                                                                        
    └──────┴────────────────────────┴──────────────────────────────────┘                                                                        
    Day 17-18: Demo + Submit                                                                                                                    
    ┌──────┬─────────────────────┬──────────────────────────────────┐                                                                           
    │ Task │     Description     │           Deliverable            │                                                                           
    ├──────┼─────────────────────┼──────────────────────────────────┤                                                                           
    │ 9.1  │ Demo rehearsal      │ Run through script 5+ times      │                                                                           
    ├──────┼─────────────────────┼──────────────────────────────────┤                                                                           
    │ 9.2  │ Record backup video │ 3-min full flow recording        │                                                                           
    ├──────┼─────────────────────┼──────────────────────────────────┤                                                                           
    │ 9.3  │ Write README        │ Setup instructions, architecture │                                                                           
    ├──────┼─────────────────────┼──────────────────────────────────┤                                                                           
    │ 9.4  │ Final testing       │ All flows work on testnet        │                                                                           
    ├──────┼─────────────────────┼──────────────────────────────────┤                                                                           
    │ 9.5  │ Submit              │ Code + video + writeup           │                                                                           
    └──────┴─────────────────────┴──────────────────────────────────┘                                                                           
    ---                                                                                                                                         
    Critical Path                                                                                                                               
                                                                                                                                                
    create_trigger() ──► agent polling ──► submit_attestation() ──► Chain Signatures ──► ETH payout                                             
         [Day 2]           [Day 5]            [Day 8]                 [Day 10]          [Day 12]                                                
                                                                                                                                                
    The Chain Signatures integration (Days 9-10) is the highest-risk item. If it blocks, the fallback is to demo with                           
    a simulated payout (show the signed transaction, explain broadcast would happen).                                                           
                                                                                                                                                
    ---                                                                                                                                         
    Tech Decisions                                                                                                                              
    ┌───────────────────┬─────────────────────────────────┬──────────────────────────────────┐                                                  
    │     Component     │             Choice              │            Rationale             │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Contract language │ Rust + near-sdk-rs              │ Required for NEAR                │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Frontend          │ Next.js 14 + App Router         │ Modern, fast to build            │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Styling           │ Tailwind + shadcn/ui            │ Rapid UI development             │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Agent runtime     │ Node.js + TypeScript            │ Lighter than Rust, good NEAR SDK │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Mock API          │ Next.js API routes              │ Same deployment as frontend      │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Hosting           │ Vercel                          │ Free, simple deployment          │                                                  
    ├───────────────────┼─────────────────────────────────┼──────────────────────────────────┤                                                  
    │ Chain             │ NEAR testnet + Ethereum Sepolia │ Free testnets                    │                                                  
    └───────────────────┴─────────────────────────────────┴──────────────────────────────────┘                                                  
    ---                                                                                                                                         
    What We're NOT Building (Scope Control)                                                                                                     
                                                                                                                                                
    - ❌ Real FlightAware API integration (mock is sufficient)                                                                                  
    - ❌ Multiple condition types (weather, sports)                                                                                             
    - ❌ Multi-source verification                                                                                                              
    - ❌ Mobile app                                                                                                                             
    - ❌ Mainnet deployment                                                                                                                     
    - ❌ Fiat on/off ramps                \                                                                                                     
  Demo Preparation Checklist                                                                                                                    
  Item Status Notes NEAR testnet wallet funded ⬜ Need ~100 NEAR for testing Contract deployed to testnet ⬜ triggerpay.testnet Ethereum        
  Sepolia ETH ⬜ Need ~1 ETH for payout demos Chain Signatures path registered ⬜ "ethereum-1" derivation path Mock API deployed ⬜ Vercel with 
   admin endpoint Agent running and logging ⬜ Terminal visible during demo Etherscan tab pre-loaded ⬜ Ready to show transaction Backup        
  recording ⬜ Full flow recorded in case live fails Network tested ⬜ Verify testnet is responsive                                             
  7. Pitch Narrative                                                                                                                            
  The Pitch (2-minute version)                                                                                                                  
  PROBLEM                                                                                                                                       
  Every year, 150 million flights get delayed or cancelled. When it happens to you, here's what follows:                                        
                                                                                                                                                
  1. You realize you're stranded                                                                                                                
                                                                                                                                                
  2. You dig through email for your insurance policy                                                                                            
                                                                                                                                                
  3. You file a claim online                                                                                                                    
                                                                                                                                                
  4. You wait 5-15 business days                                                                                                                
                                                                                                                                                
  5. Maybe you get paid. Maybe you don't.                                                                                                       
                                                                                                                                                
  This process exists because insurance companies can't verify events trustlessly, and they can't pay you instantly across different payment    
  rails.                                                                                                                                        
  But it's not just flights. It's weather-triggered payouts for farmers. It's automatic refunds when packages are delayed. It's any situation   
  where a real-world fact should release funds—but today, humans have to verify and approve every step.                                         
  SOLUTION                                                                                                                                      
  TriggerPay eliminates the human in the loop.                                                                                                  
  You define a condition: "If flight AA1234 is cancelled, pay me 0.5 ETH."                                                                      
  You fund an escrow once.                                                                                                                      
  Then you walk away.                                                                                                                           
  Our Shade Agent monitors the flight status inside a Trusted Execution Environment. Every 15 minutes, it produces a cryptographic              
  attestation—proof of exactly what data it saw and when.                                                                                       
  The moment the condition is met, the agent submits the attestation to our NEAR contract. The contract verifies the proof and uses Chain       
  Signatures to sign an Ethereum transaction. Your payout arrives in seconds.                                                                   
  No claim filed. No approval needed. No trust required.                                                                                        
  HOW IT WORKS (technical for judges)                                                                                                           
  Three NEAR-native capabilities make this possible:                                                                                            
                                                                                                                                                
  1. Shade Agents (TEE): The agent runs in a secure enclave. You can verify exactly what code is running and trust that it processed the API    
  response honestly. No "trust our server" problem.                                                                                             
                                                                                                                                                
  2. Chain Signatures: NEAR's MPC network signs transactions for any chain. We don't run an Ethereum node or bridge. We just request a          
  signature for our derived address, and the MPC network produces it.                                                                           
                                                                                                                                                
  3. Attestation verification: The contract only releases funds when it receives a valid TEE attestation. The on-chain logic is simple; the     
  trust comes from the TEE proof.                                                                                                               
                                                                                                                                                
  This architecture is impossible on Ethereum (no native TEE), impractical on Solana (no cross-chain signing), and doesn't exist anywhere else  
  in this combination.                                                                                                                          
  IMPACT                                                                                                                                        
  For users: Protection that works while you sleep.                                                                                             
  For developers: A composable primitive. Build any "if X then pay Y" product on top of TriggerPay's infrastructure.                            
  For NEAR: A concrete demonstration that Shade Agents + Chain Signatures unlock use cases no other ecosystem can touch.                        
  WHERE WE'RE GOING                                                                                                                             
  The hackathon MVP handles flight cancellations on one API.                                                                                    
  The product handles any condition from any API, triggering payments to any chain.                                                             
  Weather events. Sports outcomes. Delivery confirmations. Price thresholds.                                                                    
  Any fact that touches the internet can trigger any payment that touches a blockchain.                                                         
  That's programmable trust.                                                                                                                    
  That's TriggerPay.                                                                                                                            
  8. Judge Appeal Mapping                                                                                                                       
  Track Alignment                                                                                                                               
  Track Fit Score How TriggerPay Demonstrates It Open Society: Real World → On-Chain ⭐⭐⭐⭐⭐ Core product: real-world fact (flight status) → 
   on-chain outcome (cross-chain payout). This is literally the track description. AI That Works for You ⭐⭐⭐⭐ Shade Agent operates          
  autonomously on user's behalf. User sets intent once, agent executes indefinitely without human action. Only on NEAR ⭐⭐⭐⭐⭐ Uses Shade    
  Agents (TEE), Chain Signatures (cross-chain), code hash attestation. No other chain can do this combination. Private Web ⭐⭐⭐ Condition     
  verification inside TEE—API responses never exposed publicly. Privacy is a feature, though not the core value prop.                           
  Judging Criteria Mapping                                                                                                                      
  Criterion How TriggerPay Scores Evidence Working Demo Strong Live end-to-end: create trigger → simulate cancellation → ETH arrives in wallet. 
   Not slides—actual transactions. NEAR Leverage Very Strong Three flagship technologies in one product: Shade Agents, Chain Signatures,        
  on-chain attestation verification. Product Clarity Very Strong "If X happens, pay me Y" is instantly understandable. No blockchain jargon     
  needed in the pitch. Technical Quality Strong TEE attestation, cross-chain signing, proper escrow mechanics. Architecturally sound, not a     
  wrapper. Future Potential Very Strong Pattern generalizes to any API + any chain. Clear path from flight insurance → full programmable trust  
  infrastructure.                                                                                                                               
  Why Judges Will Remember TriggerPay                                                                                                           
                                                                                                                                                
  1. The demo moment: Watching ETH appear on Etherscan after a simulated cancellation is visceral. Judges remember feeling, not features.       
                                                                                                                                                
  2. The "I want this" factor: Everyone has had a cancelled flight. They instantly imagine having TriggerPay.                                   
                                                                                                                                                
  3. The "Only on NEAR" story: When judges debate "did this really need NEAR?", TriggerPay has the clearest answer: TEE + cross-chain signing   
  is architecturally impossible elsewhere.                                                                                                      
                                                                                                                                                
  4. The empty lane: Open Society track has weak competition. Being the best "real-world → on-chain" project is achievable.                     
                                                                                                                                                
  Potential Judge Questions (Prepared Answers)                                                                                                  
  Question Answer "What if the API lies?" "For MVP, we use a single trusted API. Production version would require N-of-M source agreement       
  (e.g., 2 of 3 flight data providers must report cancelled). The TEE attests to the query and response, so we can always prove what data was   
  seen." "Why not just use Chainlink?" "Chainlink handles price feeds, not arbitrary conditions. There's no 'flight status oracle.'             
  TriggerPay's architecture handles any condition that exists in any API—including APIs that don't have Chainlink adapters." "Isn't this just   
  insurance?" "The primitive is broader. Insurance is one application. The same pattern works for escrow release, automated hedging,            
  conditional NFT mints, or any 'wait for X, then do Y' workflow. We built flight insurance because it demos well." "How do you make money?" "2 
   NEAR execution fee per trigger (visible in the demo). Future: premium for faster check intervals, enterprise API for custom conditions,      
  white-label for insurance protocols." "What's the regulatory risk?" "We're infrastructure, not an insurance company. We don't underwrite      
  risk—users fund their own escrows. It's closer to a smart contract wallet with conditional release than a financial product. But yes,         
  production would need legal review per jurisdiction."                                                                                         
  Implementation Timeline                                                                                                                       
  18-Day Sprint Plan                                                                                                                            
                                                                                                                                                
  ```                                                                                                                                           
  ┌─────────────────────────────────────────────────────────────────────────────────┐                                                           
  │                              18-DAY IMPLEMENTATION PLAN                          │                                                          
  └─────────────────────────────────────────────────────────────────────────────────┘                                                           
                                                                                                                                                
  WEEK 1: CORE INFRASTRUCTURE (Days 1-6)                                                                                                        
  ──────────────────────────────────────                                                                                                        
                                                                                                                                                
  Day 1-2: Contract Foundation                                                                                                                  
  ├── Set up NEAR Rust project                                                                                                                  
  ├── Implement Trigger struct and storage                                                                                                      
  ├── Implement create_trigger() with deposit handling                                                                                          
  ├── Implement get_trigger() and get_active_triggers()                                                                                         
  ├── Write unit tests                                                                                                                          
  └── Deploy to testnet                                                                                                                         
                                                                                                                                                
  Day 3-4: Mock API + Basic Agent                                                                                                               
  ├── Create Next.js project (will serve frontend + API)                                                                                        
  ├── Implement /api/flight/:number endpoint                                                                                                    
  ├── Implement /api/admin/set-status endpoint                                                                                                  
  ├── Create basic agent script (Node.js)                                                                                                       
  ├── Implement polling loop (fetch triggers, check API)                                                                                        
  └── Test agent reads from contract and API                                                                                                    
                                                                                                                                                
  Day 5-6: Attestation Flow                                                                                                                     
  ├── Design attestation schema                                                                                                                 
  ├── Implement TEE signing in agent (mock for now, real TEE later)                                                                             
  ├── Implement submit_attestation() in contract                                                                                                
  ├── Implement signature verification in contract                                                                                              
  ├── Test full flow: create → agent checks → attestation stored                                                                                
  └── No payout yet, just attestation recording                                                                                                 
                                                                                                                                                
                                                                                                                                                
  WEEK 2: CHAIN SIGNATURES + UI (Days 7-12)                                                                                                     
  ─────────────────────────────────────────                                                                                                     
                                                                                                                                                
  Day 7-8: Chain Signatures Integration                                                                                                         
  ├── Study NEAR Chain Signatures SDK/examples                                                                                                  
  ├── Register derivation path for TriggerPay                                                                                                   
  ├── Implement Ethereum transaction building in contract                                                                                       
  ├── Implement MPC signing request                                                                                                             
  ├── Test: can we sign an ETH transaction from the contract?                                                                                   
  └── This is the highest-risk technical item                                                                                                   
                                                                                                                                                
  Day 9-10: Payout Execution                                                                                                                    
  ├── Implement full payout flow in submit_attestation()                                                                                        
  ├── If condition_met → build tx → sign → broadcast                                                                                            
  ├── Implement simple relayer (or use callback pattern)                                                                                        
  ├── Test end-to-end: condition met → ETH arrives on Sepolia                                                                                   
  ├── Implement claim_refund() for expired triggers                                                                                             
  └── Contract is now feature-complete for MVP                                                                                                  
                                                                                                                                                
  Day 11-12: Frontend Foundation                                                                                                                
  ├── Set up Next.js pages (landing, create, dashboard)                                                                                         
  ├── Implement NEAR wallet connection (@near-wallet-selector)                                                                                  
  ├── Build create trigger form                                                                                                                 
  ├── Build trigger status card                                                                                                                 
  ├── Connect frontend to contract (view functions)                                                                                             
  ├── Test: can create trigger from UI                                                                                                          
  └── Basic styling with Tailwind                                                                                                               
                                                                                                                                                
                                                                                                                                                
  WEEK 3: POLISH + DEMO PREP (Days 13-18)                                                                                                       
  ───────────────────────────────────────                                                                                                       
                                                                                                                                                
  Day 13-14: Frontend Polish                                                                                                                    
  ├── Implement transaction signing flow in UI                                                                                                  
  ├── Add loading states, error handling                                                                                                        
  ├── Add trigger history view                                                                                                                  
  ├── Improve styling (make it demo-ready)                                                                                                      
  ├── Add Etherscan links for executed triggers                                                                                                 
  └── Test full user flow multiple times                                                                                                        
                                                                                                                                                
  Day 15-16: Agent Hardening + TEE                                                                                                              
  ├── Move agent to proper Shade Agent infrastructure                                                                                           
  │   (or document that it's running in TEE-simulated mode)                                                                                     
  ├── Implement proper logging (visible for demo)                                                                                               
  ├── Add retry logic for API failures                                                                                                          
  ├── Test agent reliability over 24 hours                                                                                                      
  └── Ensure agent runs automatically (not manually triggered)                                                                                  
                                                                                                                                                
  Day 17: Demo Rehearsal                                                                                                                        
  ├── Run through demo script 5+ times                                                                                                          
  ├── Identify and fix any friction points                                                                                                      
  ├── Record backup video of full flow                                                                                                          
  ├── Prepare all browser tabs, terminals                                                                                                       
  ├── Test on backup internet connection                                                                                                        
  └── Write submission documentation                                                                                                            
                                                                                                                                                
  Day 18: Submission                                                                                                                            
  ├── Final code cleanup                                                                                                                        
  ├── Write README with setup instructions                                                                                                      
  ├── Record final demo video (3 min)                                                                                                           
  ├── Write product narrative (500 words)                                                                                                       
  ├── Submit before deadline                                                                                                                    
  └── Breathe                                                                                                                                   
                            