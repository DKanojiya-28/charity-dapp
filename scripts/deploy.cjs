
const hre = require("hardhat");

async function main() {
    const CharityDonation = await hre.ethers.getContractFactory(
        "CharityDonation"
    );

    const charity = await CharityDonation.deploy();
    await charity.waitForDeployment();

    console.log(
        "CharityDonation deployed to:",
        await charity.getAddress()
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
