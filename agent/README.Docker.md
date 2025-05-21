### Building and running your application

#To run 
When you're ready, start your application by running:
"JOB_ID=123 docker compose up"

            or

"docker run -e JOB_ID=123 your-image"
            or
docker compose run --rm server python run.py --job-id 123

#to build When I make changes to the source code itself, run
`docker compose up --build`.
to ensure i hae the lates version of the base image.

Your application will be available at http://localhost:8000.

### Deploying your application to the cloud

First, build your image, e.g.: `docker build -t myapp .`.
If your cloud uses a different CPU architecture than your development
machine (e.g., you are on a Mac M1 and your cloud provider is amd64),
you'll want to build the image for that platform, e.g.:
`docker build --platform=linux/amd64 -t myapp .`.

Then, push it to your registry, e.g. `docker push myregistry.com/myapp`.

Consult Docker's [getting started](https://docs.docker.com/go/get-started-sharing/)
docs for more detail on building and pushing.

### References
* [Docker's Python guide](https://docs.docker.com/language/python/)