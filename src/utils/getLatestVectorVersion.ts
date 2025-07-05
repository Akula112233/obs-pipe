import axios from "axios";

export async function getLatestVectorVersion(): Promise<string> {
    try {
        const response = await axios.get(
            "https://hub.docker.com/v2/repositories/timberio/vector/tags/?page_size=1"
        );
        const latestVersion = response.data.results[0].name; // Fetch latest tag
        return latestVersion;
    } catch (error) {
        console.error("Error fetching latest Vector version:", error);
        throw new Error("Unable to fetch the latest Vector version");
    }
}