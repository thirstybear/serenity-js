import * as fs      from 'graceful-fs';
import * as mkdirp  from 'mkdirp';
import * as path    from 'path';

export interface Outlet {
    sendPicture(destination: string, base64EncodedData: string): PromiseLike<string>;
    sendJSON   (destination: string, json: any): PromiseLike<string>;
}

export class FileSystemOutlet {

    constructor(private root: string) {}

    public sendPicture(relativePathToFile: string, base64EncodedData: string): PromiseLike<string> {

        return this.prepareDirectory(relativePathToFile).
            then((pathToFile) => this.write(pathToFile, new Buffer(base64EncodedData, 'base64')));
    }

    public sendJSON(relativePathToFile: string, json: any): PromiseLike<string> {

        return this.prepareDirectory(relativePathToFile).
            then((pathToFile) => this.write(pathToFile, JSON.stringify(json)));
    }

    // --

    private prepareDirectory(relativePathToFile: string): PromiseLike<string> {
        if (! this.specified(relativePathToFile)) {
            return this.complaint('Please specify where the file should be saved.');
        }

        let absolutePath = path.resolve(this.root, relativePathToFile),
            parent       = path.dirname(absolutePath);

        return new Promise((resolve, reject) => {

            mkdirp(parent, (error, dir) => {
                if (error) {
                    reject(error);
                }

                resolve(absolutePath);
            });
        });
    }

    private specified(value: string): boolean {
        return !! (value && value.length);
    }

    private complaint(message: string): PromiseLike<string> {
        return Promise.reject<string>(new Error(message));
    }

    private write(path: string, data: any): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, data, (error) => {
                if (error) {
                    reject(error);
                }

                resolve(path);
            });
        });
    }
}
