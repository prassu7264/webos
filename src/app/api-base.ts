export class clienturl {

    static CURRENT_VERSION(): String {
        return "v1.0.1"
    }

    static RELEASE_DATE(): String {

        return "Monday, 18 August 2025";
    }

    static SERVER_URL(): String {

        return 'https://ds.iqtv.in:8080/iqserver/api/server/getserverdetails';
    }


    static WEB_URL(): String {

        return "https://ds.iqtv.in";
    }
    static AUTH_URL(): String {
        
        return 'https://ds.iqtv.in:8080/iqworld/api/auth';
    }

    static BASE_URL(): String {

        return 'https://ds.iqtv.in:8080/iqworld';
    }

}