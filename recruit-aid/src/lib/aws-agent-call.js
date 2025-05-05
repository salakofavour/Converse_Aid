// import { request } from 'http';

const delete_endpoint = 'https://api.us-east-1.aws.endpoints.huggingface.cloud/models/'
const create_endpoint='https://api.us-east-1.aws.endpoints.huggingface.cloud/models/'
export async function initiateAgent(jobId) {
    const {data, error} = await fetch(create_endpoint, {
      method: 'POST',
      body: JSON.stringify({
        "name": jobId.toString()
      })
    });
    if (error) {
        throw new Error(error);
    }
    return data;
}

export async function endAgent(jobId) {
    const {data, error} = await fetch(delete_endpoint, {
      method: 'POST',
      body: JSON.stringify({
        "name": jobId.toString()
      })
    });
    if (error) {
        throw new Error(error);
    }
    return data;
}

//still not sure if I need to add the parameter to the url or pass it as a body or 
//if it doesnt matter. will discover soon.