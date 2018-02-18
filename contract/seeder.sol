pragma solidity ^0.4.19;

contract Seeder {

    event CharityAdd(uint256 indexed _charityId);
    event VoterCast(address indexed _address, uint256 indexed _charityId, uint256 _score);
    event CharityPass(uint256 indexed _charityId);

    struct Charity {
        bytes32 _name;
        address _address;
        uint256 _totalScores;
        uint256 _totalVotes;
        mapping (address => uint256) _votes;
    }

    modifier isOpen() {
        require((now <= endTime) && (passedCharityId == 0));
        _;
    }

    modifier isEnded() {
        require(endTime <= now);
        _;
    }

    address owner;
    uint256 public endTime;
    uint256 public passedCharityId;
    Charity[] charities;

    function Seeder(uint256 _endTime) public {
        owner = msg.sender;
        endTime = _endTime;
    }

    function addCharity(bytes32 _name, address _address) public isOpen {
        charities.push(Charity(_name, _address, 0, 0));
        CharityAdd(charities.length - 1);
    }

    function getCharities() public view returns(bytes32[], address[], uint256[], uint256[]) {
        uint256 totalCharities = charities.length;
        bytes32[] memory names = new bytes32[](totalCharities);
        address[] memory addresses = new address[](totalCharities);
        uint256[] memory totalScores = new uint256[](totalCharities);
        uint256[] memory totalVotes = new uint256[](totalCharities);

        for (uint256 _charityId = 0; _charityId < totalCharities; _charityId++) {
            Charity storage _charity = charities[_charityId];
            names[_charityId] = _charity._name;
            addresses[_charityId] = _charity._address;
            totalScores[_charityId] = _charity._totalScores;
            totalVotes[_charityId] = _charity._totalVotes;
        }

        return (names, addresses, totalScores, totalVotes);
    }

    function getVotes() public view returns(uint256[]) {
        uint256 totalCharities = charities.length;
        uint256[] memory voterScores = new uint256[](totalCharities);

        for (uint256 _charityId = 0; _charityId < totalCharities; _charityId++) {
            Charity storage _charity = charities[_charityId];
            voterScores[_charityId] = _charity._votes[msg.sender];
        }

        return voterScores;
    }

    function vote(uint256 _charityId, uint256 _score) public isOpen {
        Charity storage _charity = charities[_charityId];
        uint256 _vote = _charity._votes[msg.sender];

        if (_score > 0) {
            // undo any previous score
            _charity._totalScores -= _vote;
            // handle new vote
            _charity._totalScores += _score;
        } else {
            // handle vote delete
            _charity._totalScores +=  _vote;
        }

        _charity._totalVotes++;
        _charity._votes[msg.sender] = _score;
        VoterCast(msg.sender, _charityId, _score);
    }

    function pass() public isEnded {
        uint256 _topCharityId;
        uint256 _topAverageCharityScore;
        for (uint256 _charityId = 0; _charityId < charities.length; _charityId++) {
            Charity storage _charity = charities[_charityId];
            uint256 _averageCharityScore = _charity._totalScores / _charity._totalVotes;
            // if there is a tie, we cannot choose a charity to pass
            require(_averageCharityScore != _topAverageCharityScore);
            // set new max
            if (_averageCharityScore > _topAverageCharityScore) {
                _topAverageCharityScore = _averageCharityScore;
                _topCharityId = _charityId;
            }
        }
        
        passedCharityId = _topCharityId;
        // forward charity to Seedom (after end)
        CharityPass(_topCharityId);
    }

}