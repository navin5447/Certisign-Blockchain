// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Certificate
 * @dev ERC721 token representing educational certificates
 */
contract Certificate is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Mapping to track revoked certificates
    mapping(uint256 => bool) private _revokedCertificates;
    
    // Mapping to store certificate metadata
    mapping(uint256 => CertificateData) private _certificateData;
    
    struct CertificateData {
        string studentName;
        string course;
        string institution;
        uint256 issueDate;
        uint256 graduationDate;
        string ipfsHash;
        bool isRevoked;
    }

    event CertificateMinted(
        address indexed to,
        uint256 indexed tokenId,
        string studentName,
        string course,
        string institution,
        string metadataURI
    );
    
    event CertificateRevoked(
        uint256 indexed tokenId,
        string reason
    );

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    /**
     * @dev Mint a new certificate NFT
     * @param to Address to mint the certificate to
     * @param studentName Name of the student
     * @param course Course/degree name
     * @param institution Institution name
     * @param issueDate Date of certificate issuance (timestamp)
     * @param graduationDate Date of graduation (timestamp)
     * @param metadataURI IPFS URI containing certificate metadata
     * @param ipfsHash IPFS hash of the certificate
     */
    function mintCertificate(
        address to,
        string memory studentName,
        string memory course,
        string memory institution,
        uint256 issueDate,
        uint256 graduationDate,
        string memory metadataURI,
        string memory ipfsHash
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        // Store certificate data
        _certificateData[tokenId] = CertificateData({
            studentName: studentName,
            course: course,
            institution: institution,
            issueDate: issueDate,
            graduationDate: graduationDate,
            ipfsHash: ipfsHash,
            isRevoked: false
        });

        emit CertificateMinted(to, tokenId, studentName, course, institution, metadataURI);
        
        return tokenId;
    }

    /**
     * @dev Revoke a certificate
     * @param tokenId Token ID to revoke
     * @param reason Reason for revocation
     */
    function revokeCertificate(uint256 tokenId, string memory reason) public onlyOwner {
        require(_exists(tokenId), "Certificate does not exist");
        require(!_revokedCertificates[tokenId], "Certificate already revoked");

        _revokedCertificates[tokenId] = true;
        _certificateData[tokenId].isRevoked = true;

        emit CertificateRevoked(tokenId, reason);
    }

    /**
     * @dev Check if a certificate is revoked
     * @param tokenId Token ID to check
     */
    function isRevoked(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Certificate does not exist");
        return _revokedCertificates[tokenId];
    }

    /**
     * @dev Get certificate status and basic info
     * @param tokenId Token ID to query
     */
    function getCertificateStatus(uint256 tokenId) public view returns (
        bool exists,
        bool revoked,
        string memory studentName,
        string memory course,
        string memory institution,
        uint256 issueDate
    ) {
        if (!_exists(tokenId)) {
            return (false, false, "", "", "", 0);
        }

        CertificateData memory cert = _certificateData[tokenId];
        return (
            true,
            cert.isRevoked,
            cert.studentName,
            cert.course,
            cert.institution,
            cert.issueDate
        );
    }

    /**
     * @dev Get full certificate data
     * @param tokenId Token ID to query
     */
    function getCertificateData(uint256 tokenId) public view returns (CertificateData memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return _certificateData[tokenId];
    }

    /**
     * @dev Get the current token counter (next token ID to be minted)
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Batch mint certificates (for efficiency)
     * @param recipients Array of recipient addresses
     * @param studentNames Array of student names
     * @param courses Array of course names
     * @param institutions Array of institution names
     * @param issueDates Array of issue dates
     * @param graduationDates Array of graduation dates
     * @param metadataURIs Array of IPFS metadata URIs
     * @param ipfsHashes Array of IPFS hashes
     */
    function batchMintCertificates(
        address[] memory recipients,
        string[] memory studentNames,
        string[] memory courses,
        string[] memory institutions,
        uint256[] memory issueDates,
        uint256[] memory graduationDates,
        string[] memory metadataURIs,
        string[] memory ipfsHashes
    ) public onlyOwner returns (uint256[] memory) {
        require(recipients.length == studentNames.length, "Array length mismatch");
        require(recipients.length == courses.length, "Array length mismatch");
        require(recipients.length == institutions.length, "Array length mismatch");
        require(recipients.length == issueDates.length, "Array length mismatch");
        require(recipients.length == graduationDates.length, "Array length mismatch");
        require(recipients.length == metadataURIs.length, "Array length mismatch");
        require(recipients.length == ipfsHashes.length, "Array length mismatch");

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = mintCertificate(
                recipients[i],
                studentNames[i],
                courses[i],
                institutions[i],
                issueDates[i],
                graduationDates[i],
                metadataURIs[i],
                ipfsHashes[i]
            );
        }

        return tokenIds;
    }

    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}