import Foundation

// MARK: - Period

enum LiteraryPeriod: String, Codable, CaseIterable {
    case sangam       = "sangam"
    case medieval     = "medieval"
    case bhakti       = "bhakti"
    case colonial     = "colonial"
    case modern       = "modern"
    case contemporary = "contemporary"

    var displayName: String {
        switch self {
        case .sangam:       return "சங்க இலக்கியம்"
        case .medieval:     return "இடைக்காலம்"
        case .bhakti:       return "பக்தி இலக்கியம்"
        case .colonial:     return "காலனி காலம்"
        case .modern:       return "நவீன இலக்கியம்"
        case .contemporary: return "சமகால இலக்கியம்"
        }
    }

    var color: String {
        switch self {
        case .sangam:       return "#E8500A"
        case .medieval:     return "#F5C518"
        case .bhakti:       return "#9B59B6"
        case .colonial:     return "#2ECC71"
        case .modern:       return "#3498DB"
        case .contemporary: return "#E74C3C"
        }
    }
}

// MARK: - Genre

enum LiteraryGenre: String, Codable, CaseIterable {
    case poetry  = "poetry"
    case prose   = "prose"
    case grammar = "grammar"
    case epic    = "epic"
    case folk    = "folk"

    var displayName: String {
        switch self {
        case .poetry:  return "கவிதை"
        case .prose:   return "உரைநடை"
        case .grammar: return "இலக்கணம்"
        case .epic:    return "இதிகாசம்"
        case .folk:    return "நாட்டுப்பாடல்"
        }
    }
}

// MARK: - LiteraryWork

struct LiteraryWork: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let titleTamil: String
    let author: String
    let authorTamil: String
    let period: LiteraryPeriod
    let genre: LiteraryGenre
    let ipfsCid: String
    let description: String
    let descriptionTamil: String
    var isVerifiedOnChain: Bool
    let chainTxHash: String?
    let yearEstimate: String?
    let language: String
    var isCached: Bool

    init(
        id: String,
        title: String,
        titleTamil: String,
        author: String,
        authorTamil: String,
        period: LiteraryPeriod,
        genre: LiteraryGenre,
        ipfsCid: String,
        description: String,
        descriptionTamil: String,
        isVerifiedOnChain: Bool = false,
        chainTxHash: String? = nil,
        yearEstimate: String? = nil,
        language: String = "ta",
        isCached: Bool = false
    ) {
        self.id                = id
        self.title             = title
        self.titleTamil        = titleTamil
        self.author            = author
        self.authorTamil       = authorTamil
        self.period            = period
        self.genre             = genre
        self.ipfsCid           = ipfsCid
        self.description       = description
        self.descriptionTamil  = descriptionTamil
        self.isVerifiedOnChain = isVerifiedOnChain
        self.chainTxHash       = chainTxHash
        self.yearEstimate      = yearEstimate
        self.language          = language
        self.isCached          = isCached
    }

    var ipfsURL: URL? {
        URL(string: "\(AppConfig.ipfsGateway)/ipfs/\(ipfsCid)")
    }
}

// MARK: - API Response

struct LiteratureListResponse: Decodable {
    let works: [LiteraryWork]
    let total: Int
    let page: Int
    let limit: Int
}
