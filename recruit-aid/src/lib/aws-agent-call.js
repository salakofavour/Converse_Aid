
const delete_endpoint = process.env.AGENT_DELETE_SCHEDULE;
const create_endpoint=process.env.AGENT_CREATE_SCHEDULE;
const api_key=process.env.AGENT_API_KEY;

const headers = {
    'Content-Type': 'application/json',
    'x-api-key': api_key
}

export async function initiateAgent(jobId) {
    const {data, error} = await fetch(create_endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        "name": jobId.toString()
      })
    });
    if (error) {
        console.log("error in initiateAgent", error);
        throw new Error(error);
    }
    console.log("create schedule response", data);
    return data;
}

export async function endAgent(jobId) {
    const {data, error} = await fetch(delete_endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        "name": jobId.toString()
      })
    });
    if (error) {
        console.log("error in endAgent", error);
        throw new Error(error);
    }
    console.log("delete schedule response", data);
    return data;
}