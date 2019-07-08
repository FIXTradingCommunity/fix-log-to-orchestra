
export default class Utility {
    public static FN(val:string | null):string {
        if (val) {
            return val;
        }
        return "";
    }

    public static ClearObjProps(obj: { [x: string]: any; }) {    
        Object.keys(obj).forEach(key => {
            delete obj[key];
        });    
    }

    public static Log(obj:any) {
        // tslint:disable-next-line:no-console
        console.log(obj);
    }

    public static GetMOPublicKey() : string {
        const pk = "-----BEGIN PUBLIC KEY-----\n"+
                    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzIKQ+V528e3nGaOL72XA\n"+
                    "avmL2HAXwdG5+0Cg2X+ezPfSn2U+DxbYOKFyHXfdCj4ocgF1MKk1ECUDhMlZ6vsl\n"+
                    "m7ZPuq9Nus6cYeBxSFdKXaC+vI0hpghkGwAl7a6YT4HAbZ3qs+T7My5gaeuXI1j+\n"+
                    "8KBOXK8VRDormzQlI0Q+qbfqUSMCNBMsknxFWfgxvvXSBqEOV2Yq0hbp+JSrsB1S\n"+
                    "9DefmvNmxUKLDQ65MmInZ7HqfE+ocWt6H0ba9zISCgjSEs4m0fY6fr99EhuQ9vKX\n"+
                    "GcxQfvu2qAOHz0te4yQ67xoUGWzMCmZG3TUTfYz+kFVCSJSrmSnTzkppffio7ooA\n"+
                    "owIDAQAB\n"+
                    "-----END PUBLIC KEY-----\n";

        return pk;
    }
}
