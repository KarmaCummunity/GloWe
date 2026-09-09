// GloWe data layer.
// Real content is fetched from Supabase via gloweBackend. These arrays are
// empty; they exist so any reference in app.js doesn't throw before async
// data arrives. Sections that depended solely on static data show empty
// states until users create real content.

const opportunities = [];
const organizations = [];
const people = [];
const wishes = [];
const communityPosts = [];

// These sections are AI-computed features planned for a later milestone.
// They are intentionally empty so no fake content appears in production.
const dailyActions = [];
const smartMatches = [];
const appliedPlaybooks = [];

// Style config — not user-generated content, keep as-is.
const wishTypeStyles = {
    "Call for Help": { label: "Call for Help", color: "#F9C8D9" },
    "Volunteers Needed": { label: "Volunteers Needed", color: "#C4E3C1" },
    "Resource Request": { label: "Resource Request", color: "#FCF0D9" },
    "Partnership Opportunity": { label: "Looking for Collaboration", color: "#D4C1E0" },
    "Looking for Mentors": { label: "Looking for Mentors", color: "#AED9E0" },
    "Funding Support": { label: "Support Needed", color: "#AEC9D3" },
    "Knowledge Sharing": { label: "Sharing Knowledge", color: "#FCF0D9" },
    "Call for Collaboration": { label: "Call for Collaboration", color: "#D4C1E0" },
    "Open Call": { label: "Open Call", color: "#E9C9CE" },
    "Equipment / Space": { label: "Equipment / Space", color: "#FFE6BB" },
    "Visibility / Media": { label: "Media & Visibility", color: "#DECFE2" },
    "Project Spotlight": { label: "Project Spotlight", color: "#9BB4C7" },
    "We're Hiring": { label: "We're Hiring", color: "#FFE6BB" },
    "Volunteer Offer": { label: "Volunteer Offer", color: "#C4E3C1" }
};

const impactSignals = [
    { category: "Collaboration", tag: "Joint Projects", metric: "Projects created or managed in partnership" },
    { category: "Active Account", tag: "Shared Content", metric: "Posts, articles, videos, and comments published" },
    { category: "Expert Writer", tag: "Professional Knowledge", metric: "Professional posts or articles shared" },
    { category: "Leading Volunteer", tag: "Volunteer Hours", metric: "Hours of consulting, mentoring, or activity" },
    { category: "Active Learner", tag: "Knowledge Discovery", metric: "Articles, pages, and projects explored" },
    { category: "Community Bridge", tag: "Connections Made", metric: "People and organizations introduced to one another" },
    { category: "Documented Impact", tag: "Case Studies", metric: "Success stories with impact evidence" },
    { category: "Diversity & Inclusion", tag: "Diverse Collaborations", metric: "Cross-community, cross-country, or cross-sector collaborations" }
];

const postTopics = [
    {
        id: "knowledge",
        label: "Knowledge Share",
        description: "Share a practical lesson, model, method, or field insight others can adapt.",
        prompt: "What did you learn, where did it work, and how can another organization apply it?"
    },
    {
        id: "connection",
        label: "Connection Request",
        description: "Ask for a partner, mentor, donor, volunteer, business collaborator, or expert.",
        prompt: "Who are you looking for, what do you need from them, and what is the next step?"
    },
    {
        id: "success",
        label: "Success Story",
        description: "Tell the community how a collaboration, grant, event, or project created impact.",
        prompt: "What changed, who helped, and what can others learn from the story?"
    },
    {
        id: "event",
        label: "Event / Webinar",
        description: "Publish a meeting, webinar, course, community gathering, or professional session.",
        prompt: "What is happening, who should join, when is it, and where do people register?"
    },
    {
        id: "grant",
        label: "Grant / Open Call",
        description: "Share funding, awards, fellowships, calls for proposals, or partnership opportunities.",
        prompt: "Who is eligible, what is the deadline, and what should applicants prepare?"
    },
    {
        id: "guide",
        label: "Professional Guide",
        description: "Write a practical tool, checklist, template, or how-to guide for the community.",
        prompt: "What problem does this guide solve, and what steps should readers follow?"
    },
    {
        id: "discussion",
        label: "Community Discussion",
        description: "Start a focused conversation in a topic group such as education, environment, health, or rights.",
        prompt: "What question should the community discuss, and what kind of answers are useful?"
    }
];

function getOpportunityById(id) {
    return opportunities.find(opp => opp.id === parseInt(id));
}

function getFeaturedOpportunities() {
    return opportunities.filter(opp => opp.featured);
}

function getOrganizationById(id) {
    return organizations.find(org => org.id === id || org.id === String(id));
}

function getOrganizationByName(name) {
    return organizations.find(org => org.name === name);
}

function getPersonById(id) {
    return people.find(person => person.id === id);
}

function getProfileById(id) {
    return getOrganizationById(id) || getPersonById(id);
}

function getAuthorById(id) {
    return getProfileById(id);
}

function filterOpportunities(filters) {
    return opportunities.filter(opp => {
        if (filters.location && filters.location !== "all" && !opp.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
        if (filters.field && filters.field !== "all" && opp.field !== filters.field) return false;
        if (filters.commitment && filters.commitment !== "all" && opp.commitment.toLowerCase() !== filters.commitment.toLowerCase()) return false;
        if (filters.search && !`${opp.title} ${opp.description} ${opp.organization}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
    });
}
