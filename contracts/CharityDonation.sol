
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CharityDonation {
    struct Campaign {
        uint256 id;
        string title;
        string description;
        address payable creator;
        uint256 targetAmount;
        uint256 totalRaised;
        bool active;
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 private nextCampaignId = 1;

    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => Donation[]) private donations;

    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        address indexed creator,
        uint256 targetAmount
    );

    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    event CampaignStatusChanged(uint256 indexed campaignId, bool active);

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 targetAmount
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");
        require(targetAmount > 0, "Target must be positive");

        uint256 id = nextCampaignId++;

        campaigns[id] = Campaign({
            id: id,
            title: title,
            description: description,
            creator: payable(msg.sender),
            targetAmount: targetAmount,
            totalRaised: 0,
            active: true
        });

        emit CampaignCreated(id, title, msg.sender, targetAmount);
        return id;
    }

    function donateToCampaign(uint256 campaignId) external payable {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.id != 0, "Campaign does not exist");
        require(campaign.active, "Campaign is inactive");
        require(msg.value > 0, "Donation must be positive");

        campaign.totalRaised += msg.value;

        donations[campaignId].push(
            Donation({
                donor: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        emit DonationReceived(
            campaignId,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    function setCampaignStatus(uint256 campaignId, bool active) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.id != 0, "Campaign does not exist");
        require(msg.sender == campaign.creator, "Only creator can manage");
        campaign.active = active;

        emit CampaignStatusChanged(campaignId, active);
    }

    function getCampaign(uint256 campaignId)
        external
        view
        returns (Campaign memory)
    {
        require(campaigns[campaignId].id != 0, "Campaign does not exist");
        return campaigns[campaignId];
    }

    function getAllCampaigns() external view returns (Campaign[] memory) {
        uint256 count = nextCampaignId - 1;
        Campaign[] memory result = new Campaign[](count);

        for (uint256 i = 0; i < count; i++) {
            result[i] = campaigns[i + 1];
        }

        return result;
    }

    function getDonationsByCampaign(uint256 campaignId)
        external
        view
        returns (Donation[] memory)
    {
        require(campaigns[campaignId].id != 0, "Campaign does not exist");
        return donations[campaignId];
    }

    // Donations remain in the contract until the campaign creator
    // withdraws them. Only the creator can withdraw funds.
    function withdrawFunds(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.id != 0, "Campaign does not exist");
        require(msg.sender == campaign.creator, "Only creator can withdraw");

        uint256 amount = campaign.totalRaised;
        require(amount > 0, "No funds to withdraw");

        campaign.totalRaised = 0;

        (bool success, ) = campaign.creator.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
