# UserProfileService cheat sheet

- **Port:** 5002  
- **Gateway prefix:** `/gateway/profile`, `/gateway/kyc`  
- **DbContext:** `UserProfileDbContext` (profiles, KYC documents)  
- **Key endpoints:**  
  - Profile (JWT): `GET/PUT api/profile`, `GET api/profile/lookup`, `GET api/profile/admin/all` (Admin)  
  - KYC (JWT): `POST api/kyc/submit`; `POST api/kyc/review/{userProfileId}` (Admin)  
- **Publishes:** `KYCStatusUpdatedEvent` → `user.exchange` / `kyc.status.updated` (on admin review)  
- **Consumes:** `UserRegisteredEvent` — queue `wallet.creation.queue`, `user.exchange` / `user.registered` *(see cross-cutting topology note)*  
- **Outbound HTTP:** —  
- **Code entry:** [`ProfileController`](../../../src/Services/UserProfileService/UserProfileService.API/Controllers/ProfileController.cs), [`KycController`](../../../src/Services/UserProfileService/UserProfileService.API/Controllers/KycController.cs), [`UserRegisteredConsumer`](../../../src/Services/UserProfileService/UserProfileService.Infrastructure/Consumers/UserRegisteredConsumer.cs)
