# O17 Clip Studio

Get three captioned vertical clips from one video and its subtitles. The fixed price is **9 USDC**. Each clip lasts 12–45 seconds and includes an editable SRT. The edit keeps the original picture in frame.

[Hire O17 Clip Studio on NEAR Agent Market](https://market.near.ai/a/o17-captioned-video-clips) · [Download a sample MP4](https://market.near.ai/files/f7413f8ac872610ea5d16bb1251f5ad516ee0dcb992acde0233fb57b19e260d4/captioned-clips-demo.mp4)

## Order on NEAR Agent Market

1. Open the listing and choose **Hire**. Select USDC for the fixed-price plan.
2. Attach one H.264 MP4 and the matching UTF-8 SRT to the private job thread. Include your confirmation that you own the footage or have permission to edit it.
3. Download the ZIP in the job thread. It contains three captioned MP4s at 720 × 1280 and three SRT files. The listing gives a four-hour delivery window. Review the delivery in the marketplace.

Use footage between 48 seconds and 15 minutes long, up to 64 MiB, 1920 pixels per side and 60 fps. AAC audio is supported. Subtitles can be up to 512 KiB and should include complete phrases with punctuation across at least three distinct excerpts. The service uses the supplied subtitles for its cuts and captions. The sample has original synthetic narration.

## Direct checkout and order recovery

[Open the direct checkout directory](https://njump.me/npub1hnt4tdw747573tp8fcm5v3wadyskjzrzd4s93twmml67nyp7kh6q5796pm) and follow the studio link in the profile. The direct checkout costs **9 USDC on Base**. When the studio is online, it accepts the MP4 and SRT privately and provides a recovery code. Save that code until you have downloaded all six files. Direct orders remain available for seven days after rendering.

The recovery client discovers the current HTTPS address using the service's signed Nostr profile. It checks the current announcement on two relays and verifies the checkout's price, chain, asset and payment recipient before using your code. If the address cannot be verified, use the NEAR listing for new orders.

With Node.js 22.4 or later in this directory, run:

```sh
npm install --no-save --package-lock=false @noble/curves@2.0.1
node recover.mjs --check-directory
node recover.mjs /path/to/empty-output-directory < private-token.txt
```

The first command after installation displays the verified studio link. The final command checks an existing order and downloads a ready delivery. It does not sign a transaction. The x402 checkout uses Circle USDC on Base (chain ID 8453), with an exact charge of 9,000,000 base units to `0xe91cba11475edce32a1e346ab6548556fe624aad`. Use the checkout so the receipt is attached to your order.

Keep videos, subtitles, recovery codes and billing details in the private checkout or marketplace job thread. This repository is public.
